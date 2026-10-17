import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';
import { User } from '../users/user.schema.js';

export interface EventMetric {
  /** Slug of the label; joins marks across events in reports. */
  key: string;
  label: string;
}

@Schema({ timestamps: true })
export class Event {
  @Prop({ required: true, trim: true, maxlength: 120 })
  name: string;

  @Prop({ required: true, trim: true, maxlength: 300 })
  address: string;

  @Prop({ required: true, maxlength: 5000 })
  description: string;

  @Prop({ required: true, index: true })
  startsAt: Date;

  @Prop({ required: true, min: 1 })
  capacity: number;

  /**
   * Denormalized count of CONFIRMED registrations. It is only ever changed with
   * atomic conditional updates (`$inc` guarded by `confirmedCount < capacity`),
   * which is what prevents overbooking without multi-document transactions.
   */
  @Prop({ required: true, default: 0, min: 0 })
  confirmedCount: number;

  /** What admins can mark attendees with (no-show, tardiness...). Order is display order. */
  @Prop({ type: [{ _id: false, key: { type: String, required: true }, label: { type: String, required: true } }], default: [] })
  metrics: EventMetric[];

  /** Object key in the S3 bucket. */
  @Prop({ required: true })
  imageKey: string;

  @Prop({ required: true })
  imageContentType: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: User.name, required: true })
  createdBy: Types.ObjectId;

  createdAt: Date;
  updatedAt: Date;
}

export type EventDocument = HydratedDocument<Event>;
export const EventSchema = SchemaFactory.createForClass(Event);
