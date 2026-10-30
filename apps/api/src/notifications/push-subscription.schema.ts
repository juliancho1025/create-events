import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';
import { User } from '../users/user.schema.js';

/** One browser's Web Push subscription. A user can have several (one per device/browser). */
@Schema({ timestamps: true })
export class PushSubscription {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: User.name, required: true, index: true })
  user: Types.ObjectId;

  /** Push service URL; identifies the browser, so re-subscribing after another login moves it. */
  @Prop({ required: true, unique: true })
  endpoint: string;

  @Prop({ type: { _id: false, p256dh: { type: String, required: true }, auth: { type: String, required: true } }, required: true })
  keys: { p256dh: string; auth: string };

  createdAt: Date;
  updatedAt: Date;
}

export type PushSubscriptionDocument = HydratedDocument<PushSubscription>;
export const PushSubscriptionSchema = SchemaFactory.createForClass(PushSubscription);
