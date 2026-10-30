import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Event } from '../events/event.schema.js';
import { Registration, RegistrationStatus } from '../registrations/registration.schema.js';
import type { NotificationInputDto, ScheduledNotificationDto } from './notifications.dto.js';
import { PushService } from './push.service.js';
import { NotificationStatus, ScheduledNotification } from './scheduled-notification.schema.js';

const POLL_INTERVAL_MS = 30_000;

/**
 * Programmed event notifications. A poller sends whatever is due; each one is
 * claimed with an atomic PENDING -> SENT update, so it goes out once even with
 * several API instances polling the same database.
 */
@Injectable()
export class NotificationsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(NotificationsService.name);
  private timer?: NodeJS.Timeout;

  constructor(
    @InjectModel(ScheduledNotification.name) private readonly notificationModel: Model<ScheduledNotification>,
    @InjectModel(Event.name) private readonly eventModel: Model<Event>,
    @InjectModel(Registration.name) private readonly registrationModel: Model<Registration>,
    private readonly push: PushService,
  ) {}

  onModuleInit() {
    this.timer = setInterval(() => {
      this.dispatchDue().catch((err: Error) => this.logger.error(`Dispatch failed: ${err.message}`));
    }, POLL_INTERVAL_MS);
    this.timer.unref();
  }

  onModuleDestroy() {
    clearInterval(this.timer);
  }

  async list(eventId: string): Promise<ScheduledNotificationDto[]> {
    const notifications = await this.notificationModel.find({ event: eventId }).sort({ sendAt: 1, _id: 1 });
    return notifications.map((n) => ({
      id: n.id,
      minutesBefore: n.minutesBefore,
      message: n.message,
      sendAt: n.sendAt.toISOString(),
      status: n.status,
      sentAt: n.sentAt?.toISOString(),
      deliveredTo: n.deliveredTo,
    }));
  }

  /** Replaces the event's pending notifications; ones already sent stay as history. */
  async replacePending(eventId: Types.ObjectId, startsAt: Date, inputs: NotificationInputDto[]): Promise<void> {
    await this.notificationModel.deleteMany({ event: eventId, status: NotificationStatus.PENDING });
    if (!inputs.length) return;
    await this.notificationModel.insertMany(
      inputs.map(({ minutesBefore, message }) => ({
        event: eventId,
        minutesBefore,
        message,
        sendAt: new Date(startsAt.getTime() - minutesBefore * 60_000),
      })),
    );
  }

  /** Moves pending notifications along with the event's new start. */
  async reschedule(eventId: Types.ObjectId, startsAt: Date): Promise<void> {
    await this.notificationModel.updateMany({ event: eventId, status: NotificationStatus.PENDING }, [
      { $set: { sendAt: { $subtract: [startsAt, { $multiply: ['$minutesBefore', 60_000] }] } } },
    ], { updatePipeline: true });
  }

  async deleteForEvent(eventId: Types.ObjectId): Promise<void> {
    await this.notificationModel.deleteMany({ event: eventId });
  }

  /** Sends every notification due by `now` to the event's confirmed attendees. Returns how many went out. */
  async dispatchDue(now = new Date()): Promise<number> {
    let dispatched = 0;
    for (;;) {
      const notification = await this.notificationModel.findOneAndUpdate(
        { status: NotificationStatus.PENDING, sendAt: { $lte: now } },
        { $set: { status: NotificationStatus.SENT, sentAt: now } },
        { sort: { sendAt: 1, _id: 1 }, returnDocument: 'after' },
      );
      if (!notification) return dispatched;

      const [event, attendees] = await Promise.all([
        this.eventModel.findById(notification.event, { name: 1 }),
        this.registrationModel.find(
          { event: notification.event, status: RegistrationStatus.CONFIRMED },
          { user: 1 },
        ),
      ]);
      const deliveredTo = event
        ? await this.push.sendToUsers(
            attendees.map((r) => r.user),
            { title: event.name, body: notification.message, url: `/events/${event.id}` },
          )
        : 0;
      await this.notificationModel.updateOne({ _id: notification._id }, { $set: { deliveredTo } });
      dispatched++;
    }
  }
}
