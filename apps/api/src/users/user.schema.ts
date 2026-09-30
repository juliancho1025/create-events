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

  @Prop()
  avatarUrl?: string;

  @Prop({ unique: true, sparse: true })
  googleId?: string;

  @Prop({ type: String, enum: Role, default: Role.USER })
  role: Role;
}

export type UserDocument = HydratedDocument<User>;
export const UserSchema = SchemaFactory.createForClass(User);
