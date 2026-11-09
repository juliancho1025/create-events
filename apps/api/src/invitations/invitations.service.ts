import { BadRequestException, ForbiddenException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import type { AuthUser } from '../common/roles.js';
import { appConfig, type AppConfig } from '../config/app-config.js';
import { Event, type EventDocument } from '../events/event.schema.js';
import { MailSender } from '../mail/mail.sender.js';
import { PushService } from '../notifications/push.service.js';
import { RegistrationStatus } from '../registrations/registration.schema.js';
import { RegistrationsService } from '../registrations/registrations.service.js';
import { User, type UserDocument } from '../users/user.schema.js';
import { Invitation } from './invitation.schema.js';
import { AddPeopleDto, AddPersonResultDto, AddPersonStatus, InvitationDto } from './invitations.dto.js';

type Invitee = Pick<UserDocument, '_id' | 'email' | 'username' | 'name' | 'profileCompletedAt'>;

/**
 * The event creator adds people by email or username. Users who can sign up
 * (profile saved) are signed up right away, with the same seat/waitlist rules
 * as a self sign-up. Everyone else gets a pending invitation plus an email with
 * a link to the app, and is signed up when they save their profile.
 */
@Injectable()
export class InvitationsService {
  private readonly logger = new Logger(InvitationsService.name);

  constructor(
    @InjectModel(Invitation.name) private readonly invitationModel: Model<Invitation>,
    @InjectModel(Event.name) private readonly eventModel: Model<Event>,
    @InjectModel(User.name) private readonly userModel: Model<User>,
    private readonly registrations: RegistrationsService,
    private readonly push: PushService,
    private readonly mail: MailSender,
    @Inject(appConfig.KEY) private readonly config: AppConfig,
  ) {}

  async add(eventId: string, dto: AddPeopleDto, requester: AuthUser): Promise<AddPersonResultDto[]> {
    const event = await this.findOwnedOrThrow(eventId, requester);
    if (event.startsAt.getTime() <= Date.now()) {
      throw new BadRequestException('This event has already started');
    }
    const emails = [...new Set(dto.emails ?? [])];
    const usernames = [...new Set(dto.usernames ?? [])];
    if (!emails.length && !usernames.length) {
      throw new BadRequestException('Add at least one email or username');
    }

    const fields = 'email username name profileCompletedAt';
    const users: Invitee[] = await this.userModel.find(
      { $or: [{ email: { $in: emails } }, { username: { $in: usernames } }] },
      fields,
    );
    const byEmail = new Map(users.map((u) => [u.email, u]));
    const byUsername = new Map(users.filter((u) => u.username).map((u) => [u.username!, u]));
    const inviterName = (await this.userModel.findById(requester.id, 'name'))?.name ?? 'The organizer';

    // The same person can be named twice (by email and by username): add them once, report both.
    const done = new Map<string, Omit<AddPersonResultDto, 'input'>>();
    const addOnce = async (user: Invitee) => {
      const key = user._id.toString();
      if (!done.has(key)) done.set(key, await this.addUser(event, user, inviterName, requester.id));
      return done.get(key)!;
    };

    const results: AddPersonResultDto[] = [];
    for (const username of usernames) {
      const user = byUsername.get(username);
      results.push({ input: username, ...(user ? await addOnce(user) : { status: AddPersonStatus.NOT_FOUND }) });
    }
    for (const email of emails) {
      const user = byEmail.get(email);
      if (user) {
        results.push({ input: email, ...(await addOnce(user)) });
      } else {
        const emailSent = await this.invite(event, email, inviterName, requester.id, false);
        results.push({ input: email, status: AddPersonStatus.INVITED, emailSent });
      }
    }
    return results;
  }

  /** Invitations still waiting for someone to sign up (or finish their profile). */
  async list(eventId: string, requester: AuthUser): Promise<InvitationDto[]> {
    const event = await this.findOwnedOrThrow(eventId, requester);
    const invitations = await this.invitationModel.find({ event: event._id }).sort({ createdAt: 1 });
    return invitations.map((i) => ({ email: i.email, invitedAt: i.createdAt.toISOString() }));
  }

  async revoke(eventId: string, email: string, requester: AuthUser): Promise<void> {
    const event = await this.findOwnedOrThrow(eventId, requester);
    const res = await this.invitationModel.deleteOne({ event: event._id, email: email.trim().toLowerCase() });
    if (res.deletedCount === 0) throw new NotFoundException('No pending invitation for that email');
  }

  /**
   * Called whenever a user saves their profile: signs them up for every event
   * they were invited to that hasn't started, then drops their invitations.
   * Best effort per event, so one failure doesn't block the rest (or the profile save).
   */
  async acceptPending(user: UserDocument): Promise<void> {
    if (!user.profileCompletedAt) return;
    const invitations = await this.invitationModel.find({ email: user.email });
    for (const invitation of invitations) {
      try {
        const event = await this.eventModel.findById(invitation.event);
        if (event && event.startsAt.getTime() > Date.now()) {
          const registration = await this.registrations.enroll(event._id, user._id);
          if (registration) {
            const inviter = await this.userModel.findById(invitation.invitedBy, 'name');
            await this.notifyAdded(event, user._id, registration.status, inviter?.name);
          }
        }
        await invitation.deleteOne();
      } catch (err) {
        this.logger.warn(`Could not accept invitation ${invitation.id}: ${(err as Error).message}`);
      }
    }
  }

  async deleteForEvent(eventId: Types.ObjectId): Promise<void> {
    await this.invitationModel.deleteMany({ event: eventId });
  }

  private async addUser(
    event: EventDocument,
    user: Invitee,
    inviterName: string,
    inviterId: string,
  ): Promise<Omit<AddPersonResultDto, 'input'>> {
    // Same rule as a self sign-up: organizers rely on the emergency contact.
    if (!user.profileCompletedAt) {
      const emailSent = await this.invite(event, user.email, inviterName, inviterId, true);
      return { status: AddPersonStatus.PENDING_PROFILE, name: user.name, emailSent };
    }
    const registration = await this.registrations.enroll(event._id, user._id);
    if (!registration) return { status: AddPersonStatus.ALREADY_REGISTERED, name: user.name };
    await this.notifyAdded(event, user._id, registration.status, inviterName);
    return {
      status:
        registration.status === RegistrationStatus.CONFIRMED ? AddPersonStatus.CONFIRMED : AddPersonStatus.WAITLISTED,
      name: user.name,
    };
  }

  /** Stores the pending invitation and emails the link. Returns whether the email went out. */
  private async invite(
    event: EventDocument,
    email: string,
    inviterName: string,
    inviterId: string,
    hasAccount: boolean,
  ): Promise<boolean> {
    await this.invitationModel.updateOne(
      { event: event._id, email },
      { $setOnInsert: { invitedBy: new Types.ObjectId(inviterId) } },
      { upsert: true },
    );
    const link = `${this.config.webUrl}/events/${event.id}`;
    const when = event.startsAt.toUTCString();
    const action = hasAccount
      ? 'Sign in and finish your profile to claim your spot.'
      : `Create your account with this email address (${email}) to claim your spot.`;
    try {
      await this.mail.send({
        to: email,
        subject: `${inviterName} invited you to ${event.name}`,
        text: `${inviterName} invited you to "${event.name}" (${when}, ${event.address}).\n\n${action}\n\n${link}\n`,
        html:
          `<p>${escapeHtml(inviterName)} invited you to <strong>${escapeHtml(event.name)}</strong> ` +
          `(${escapeHtml(when)}, ${escapeHtml(event.address)}).</p>` +
          `<p>${escapeHtml(action)}</p>` +
          `<p><a href="${escapeHtml(link)}">Open the event</a></p>`,
      });
      return true;
    } catch (err) {
      this.logger.warn(`Could not email invitation to ${email}: ${(err as Error).message}`);
      return false;
    }
  }

  /** Best effort: the registration stands whether or not the push gets through. */
  private async notifyAdded(
    event: EventDocument,
    userId: Types.ObjectId,
    status: RegistrationStatus,
    inviterName?: string,
  ): Promise<void> {
    try {
      const who = inviterName ?? 'The organizer';
      await this.push.sendToUsers([userId], {
        title: event.name,
        body:
          status === RegistrationStatus.CONFIRMED
            ? `${who} signed you up. See you there!`
            : `${who} added you to the waitlist.`,
        url: `/events/${event.id}`,
        tag: `added-${event.id}`,
      });
    } catch (err) {
      this.logger.warn(`Could not notify added user: ${(err as Error).message}`);
    }
  }

  private async findOwnedOrThrow(eventId: string, requester: AuthUser): Promise<EventDocument> {
    const event = await this.eventModel.findById(eventId);
    if (!event) throw new NotFoundException('Event not found');
    if (!event.createdBy.equals(requester.id)) {
      throw new ForbiddenException('Only the event creator can manage its invitations');
    }
    return event;
  }
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}
