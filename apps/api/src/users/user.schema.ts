import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { Role } from '../common/roles.js';

/** Mongo document, comparable to a Spring Data `@Document` entity. */
@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  email: string;

  @Prop({ required: true, trim: true })
  name: string;

  /** Picture from Google; shown when the user hasn't uploaded their own. */
  @Prop()
  avatarUrl?: string;

  /** Uploaded profile photo: object key in the S3 bucket. */
  @Prop()
  avatarKey?: string;

  @Prop()
  avatarContentType?: string;

  @Prop({ unique: true, sparse: true })
  googleId?: string;

  @Prop({ type: String, enum: Role, default: Role.USER })
  role: Role;

  /** Chosen by the user in their profile; unique, stored lowercase. */
  @Prop({ unique: true, sparse: true, lowercase: true, trim: true })
  username?: string;

  @Prop({ trim: true })
  phone?: string;

  @Prop({ type: { _id: false, name: { type: String, required: true }, phone: { type: String, required: true } } })
  emergencyContact?: EmergencyContact;

  @Prop({ trim: true, maxlength: 500 })
  allergies?: string;

  /** Set the first time the profile is saved; until then the user can't sign up for events. */
  @Prop()
  profileCompletedAt?: Date;
}

export interface EmergencyContact {
  name: string;
  phone: string;
}

export type UserDocument = HydratedDocument<User>;
export const UserSchema = SchemaFactory.createForClass(User);
