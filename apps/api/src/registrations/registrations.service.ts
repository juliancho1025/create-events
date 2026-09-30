import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Role, type AuthUser } from '../common/roles.js';
import { Event } from '../events/event.schema.js';
import type { AttendeeDto, AttendeesDto, RegistrationDto } from '../events/dto/event.dto.js';
import type { User } from '../users/user.schema.js';
import { Registration, RegistrationDocument, RegistrationStatus } from './registration.schema.js';

const WAITLIST_ORDER = { createdAt: 1, _id: 1 } as const;

export interface EventRegistrationStats {
  waitlistCount: number;
  myStatus: RegistrationStatus | null;
  myWaitlistPosition: number | null;
}

/**
 * Sign-up rules. Seat accounting relies on atomic single-document updates of
 * `Event.confirmedCount` instead of transactions, because a standalone MongoDB
 * (as in docker-compose) doesn't support multi-document transactions.
 */
@Injectable()
export class RegistrationsService {
  constructor(
    @InjectModel(Registration.name) private readonly registrationModel: Model<Registration>,
    @InjectModel(Event.name) private readonly eventModel: Model<Event>,
  ) {}

  async register(eventId: string, userId: string): Promise<RegistrationDto> {
    const event = await this.eventModel.findById(eventId);
    if (!event) throw new NotFoundException('Event not found');
    if (event.startsAt.getTime() <= Date.now()) {
      throw new BadRequestException('This event has already started');
    }
    if (await this.registrationModel.exists({ event: event._id, user: userId })) {
      throw new ConflictException('You are already signed up for this event');
    }

    const gotSeat = await this.claimSeat(event._id);
    try {
      const registration = await this.registrationModel.create({
        event: event._id,
        user: new Types.ObjectId(userId),
        status: gotSeat ? RegistrationStatus.CONFIRMED : RegistrationStatus.WAITLISTED,
      });
      return {
        status: registration.status,
        waitlistPosition: gotSeat ? null : await this.waitlistPosition(registration),
      };
    } catch (err) {
      // Double-submit race: the unique index rejected the second insert.
      if (gotSeat) await this.releaseSeat(event._id);
      if ((err as { code?: number }).code === 11000) {
        throw new ConflictException('You are already signed up for this event');
      }
      throw err;
    }
  }

  async cancel(eventId: string, userId: string): Promise<void> {
    const registration = await this.registrationModel.findOneAndDelete({
      event: eventId,
      user: userId,
    });
    if (!registration) throw new NotFoundException('You are not signed up for this event');
    if (registration.status !== RegistrationStatus.CONFIRMED) return;

    // Hand the freed seat straight to the head of the waitlist (count unchanged)...
    const promoted = await this.promoteNextWaitlisted(registration.event);
    if (!promoted) {
      // ...or give the seat back, then re-check in case someone got waitlisted meanwhile.
      await this.releaseSeat(registration.event);
      await this.fillOpenSeats(registration.event);
    }
  }

  /** Promote waitlisted users while seats are available (e.g. after capacity is increased). */
  async fillOpenSeats(eventId: Types.ObjectId): Promise<void> {
    while (await this.claimSeat(eventId)) {
      if (!(await this.promoteNextWaitlisted(eventId))) {
        await this.releaseSeat(eventId);
        return;
      }
    }
  }

  async attendees(eventId: string, requester: AuthUser): Promise<AttendeesDto> {
    if (!(await this.eventModel.exists({ _id: eventId }))) {
      throw new NotFoundException('Event not found');
    }
    const isAdmin = requester.role === Role.ADMIN;
    if (!isAdmin && !(await this.registrationModel.exists({ event: eventId, user: requester.id }))) {
      throw new ForbiddenException('Only attendees can see who is attending');
    }

    const registrations = await this.registrationModel
      .find({ event: eventId })
      .sort(WAITLIST_ORDER)
      .populate<{ user: User & { _id: Types.ObjectId } }>('user', 'name avatarUrl email');

    const toDto = (r: (typeof registrations)[number]): AttendeeDto => ({
      userId: r.user._id.toString(),
      name: r.user.name,
      avatarUrl: r.user.avatarUrl,
      ...(isAdmin && { email: r.user.email }),
      registeredAt: r.createdAt.toISOString(),
    });

    return {
      confirmed: registrations.filter((r) => r.status === RegistrationStatus.CONFIRMED).map(toDto),
      waitlist: registrations.filter((r) => r.status === RegistrationStatus.WAITLISTED).map(toDto),
    };
  }

  /** Batch-load per-event waitlist counts and the current user's status (avoids N+1 queries). */
  async statsFor(eventIds: Types.ObjectId[], userId: string): Promise<Map<string, EventRegistrationStats>> {
    const [waitlistCounts, mine] = await Promise.all([
      this.registrationModel.aggregate<{ _id: Types.ObjectId; count: number }>([
        { $match: { event: { $in: eventIds }, status: RegistrationStatus.WAITLISTED } },
        { $group: { _id: '$event', count: { $sum: 1 } } },
      ]),
      this.registrationModel.find({ event: { $in: eventIds }, user: userId }),
    ]);

    const stats = new Map<string, EventRegistrationStats>(
      eventIds.map((id) => [id.toString(), { waitlistCount: 0, myStatus: null, myWaitlistPosition: null }]),
    );
    for (const { _id, count } of waitlistCounts) stats.get(_id.toString())!.waitlistCount = count;
    for (const registration of mine) {
      const entry = stats.get(registration.event.toString())!;
      entry.myStatus = registration.status;
      if (registration.status === RegistrationStatus.WAITLISTED) {
        entry.myWaitlistPosition = await this.waitlistPosition(registration);
      }
    }
    return stats;
  }

  async deleteForEvent(eventId: Types.ObjectId): Promise<void> {
    await this.registrationModel.deleteMany({ event: eventId });
  }

  /** Atomically take a seat if one is free. Returns false when the event is full. */
  private async claimSeat(eventId: Types.ObjectId): Promise<boolean> {
    const res = await this.eventModel.updateOne(
      { _id: eventId, $expr: { $lt: ['$confirmedCount', '$capacity'] } },
      { $inc: { confirmedCount: 1 } },
    );
    return res.modifiedCount === 1;
  }

  private async releaseSeat(eventId: Types.ObjectId): Promise<void> {
    await this.eventModel.updateOne(
      { _id: eventId, confirmedCount: { $gt: 0 } },
      { $inc: { confirmedCount: -1 } },
    );
  }

  private async promoteNextWaitlisted(eventId: Types.ObjectId): Promise<RegistrationDocument | null> {
    return this.registrationModel.findOneAndUpdate(
      { event: eventId, status: RegistrationStatus.WAITLISTED },
      { $set: { status: RegistrationStatus.CONFIRMED } },
      { sort: WAITLIST_ORDER, returnDocument: 'after' },
    );
  }

  private async waitlistPosition(registration: RegistrationDocument): Promise<number> {
    const ahead = await this.registrationModel.countDocuments({
      event: registration.event,
      status: RegistrationStatus.WAITLISTED,
      $or: [
        { createdAt: { $lt: registration.createdAt } },
        { createdAt: registration.createdAt, _id: { $lt: registration._id } },
      ],
    });
    return ahead + 1;
  }
}
