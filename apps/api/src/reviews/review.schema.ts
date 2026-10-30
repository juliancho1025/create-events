import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';
import { Event } from '../events/event.schema.js';
import { User } from '../users/user.schema.js';

export const MIN_RATING = 0;
export const MAX_RATING = 5;

/**
 * A confirmed attendee's public star rating and optional comment. One per user
 * per event; writing again edits it. Like metric marks, reviews outlive the
 * registration.
 */
@Schema({ timestamps: true })
export class Review {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: Event.name, required: true })
  event: Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: User.name, required: true })
  user: Types.ObjectId;

  @Prop({ required: true, min: MIN_RATING, max: MAX_RATING })
  rating: number;

  @Prop({ trim: true, maxlength: 2000, default: '' })
  comment: string;

  createdAt: Date;
  updatedAt: Date;
}

export type ReviewDocument = HydratedDocument<Review>;
export const ReviewSchema = SchemaFactory.createForClass(Review);

ReviewSchema.index({ event: 1, user: 1 }, { unique: true });
// Serves "newest first" listings.
ReviewSchema.index({ event: 1, updatedAt: -1 });
