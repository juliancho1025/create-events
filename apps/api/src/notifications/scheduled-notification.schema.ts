import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';
import { Event } from '../events/event.schema.js';

export enum NotificationStatus {
  PENDING = 'PENDING',
  SENT = 'SENT',
}

/** Up to 30 days ahead of the event. */
export const MAX_MINUTES_BEFORE = 30 * 24 * 60;

/**
 * A push the admin programmed for an event's confirmed attendees. Stored
 * relative to the start (`minutesBefore`), with `sendAt` denormalized for the
 * dispatcher and recomputed whenever the event is moved.
 */
@Schema({ timestamps: true })
export class ScheduledNotification {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: Event.name, required: true, index: true })
  event: Types.ObjectId;

  @Prop({ required: true, min: 0, max: MAX_MINUTES_BEFORE })
  minutesBefore: number;

  @Prop({ required: true, trim: true, maxlength: 200 })
  message: string;

  @Prop({ required: true })
  sendAt: Date;

  @Prop({ type: String, enum: NotificationStatus, default: NotificationStatus.PENDING })
  status: NotificationStatus;

  @Prop()
  sentAt?: Date;

  /** Devices the push was delivered to. */
  @Prop()
  deliveredTo?: number;

  createdAt: Date;
  updatedAt: Date;
}

export type ScheduledNotificationDocument = HydratedDocument<ScheduledNotification>;
export const ScheduledNotificationSchema = SchemaFactory.createForClass(ScheduledNotification);

// Serves the dispatcher's "oldest due pending first".
ScheduledNotificationSchema.index({ status: 1, sendAt: 1 });
