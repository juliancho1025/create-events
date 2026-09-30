import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';
import { Event } from '../events/event.schema.js';
import { User } from '../users/user.schema.js';

export enum RegistrationStatus {
  CONFIRMED = 'CONFIRMED',
  WAITLISTED = 'WAITLISTED',
}

@Schema({ timestamps: true })
export class Registration {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: Event.name, required: true })
  event: Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: User.name, required: true })
  user: Types.ObjectId;

  @Prop({ type: String, enum: RegistrationStatus, required: true })
  status: RegistrationStatus;

  createdAt: Date;
  updatedAt: Date;
}

export type RegistrationDocument = HydratedDocument<Registration>;
export const RegistrationSchema = SchemaFactory.createForClass(Registration);

// One registration per user per event (enforced by Mongo, not just app code).
RegistrationSchema.index({ event: 1, user: 1 }, { unique: true });
// Serves "oldest waitlisted first" and per-status listings.
RegistrationSchema.index({ event: 1, status: 1, createdAt: 1 });
RegistrationSchema.index({ user: 1 });
