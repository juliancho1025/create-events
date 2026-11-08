import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';
import { Event } from '../events/event.schema.js';
import { User } from '../users/user.schema.js';

/**
 * Someone the event creator added who can't be signed up yet: either nobody has
 * an account with that email, or the account hasn't completed its profile.
 * Turned into a registration (and deleted) when that user saves their profile.
 */
@Schema({ timestamps: true })
export class Invitation {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: Event.name, required: true })
  event: Types.ObjectId;

  @Prop({ required: true, lowercase: true, trim: true })
  email: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: User.name, required: true })
  invitedBy: Types.ObjectId;

  createdAt: Date;
  updatedAt: Date;
}

export type InvitationDocument = HydratedDocument<Invitation>;
export const InvitationSchema = SchemaFactory.createForClass(Invitation);

InvitationSchema.index({ event: 1, email: 1 }, { unique: true });
// Serves "pending invitations for this user" when their profile is saved.
InvitationSchema.index({ email: 1 });
