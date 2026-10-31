import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsNotEmpty, IsObject, IsOptional, IsString, Matches, MaxLength, MinLength, ValidateNested } from 'class-validator';
import { Role } from '../common/roles.js';
import { avatarUrlOf } from './avatar.js';
import type { UserDocument } from './user.schema.js';

/** Digits with optional leading +, spaces, dashes, dots and parentheses: "+1 (555) 010-2030". */
const PHONE = /^\+?[0-9][0-9 ().-]{5,23}$/;
const PHONE_MESSAGE = 'must be a phone number, e.g. +1 555 010 2030';
export const USERNAME = /^[a-z0-9_.]{3,30}$/;

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);
/** Optional text fields: blank means "not set". */
const trimToUndefined = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() || undefined : value;

export class EmergencyContactDto {
  @ApiProperty({ maxLength: 100 })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiProperty({ example: '+1 555 010 2030' })
  @Transform(trim)
  @IsString()
  @Matches(PHONE, { message: `emergencyContact.phone ${PHONE_MESSAGE}` })
  phone: string;
}

/** Replaces the whole profile (PUT semantics): omitted optional fields are cleared. */
export class UpdateProfileDto {
  @ApiProperty({ maxLength: 100 })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiProperty({ example: 'ada.lovelace', description: '3-30 of a-z, 0-9, "_" and "."; case-insensitive, unique' })
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsString()
  @MinLength(3)
  @MaxLength(30)
  @Matches(USERNAME, { message: 'username may only contain letters, numbers, "_" and "."' })
  username: string;

  @ApiPropertyOptional({ example: '+1 555 010 2030' })
  @IsOptional()
  @Transform(trimToUndefined)
  @IsString()
  @Matches(PHONE, { message: `phone ${PHONE_MESSAGE}` })
  phone?: string;

  @ApiProperty({ type: EmergencyContactDto })
  @IsObject()
  @ValidateNested()
  @Type(() => EmergencyContactDto)
  emergencyContact: EmergencyContactDto;

  @ApiPropertyOptional({ maxLength: 500, example: 'Peanuts, penicillin' })
  @IsOptional()
  @Transform(trimToUndefined)
  @IsString()
  @MaxLength(500)
  allergies?: string;
}

export class UserDto {
  @ApiProperty() id: string;
  @ApiProperty() email: string;
  @ApiProperty() name: string;
  @ApiPropertyOptional({ description: 'Uploaded photo (relative to the API origin) or the Google picture' })
  avatarUrl?: string;
  @ApiProperty({ description: 'True when avatarUrl is a photo the user uploaded (so it can be removed)' })
  hasUploadedAvatar: boolean;
  @ApiProperty({ enum: Role }) role: Role;
  @ApiPropertyOptional() username?: string;
  @ApiPropertyOptional() phone?: string;
  @ApiPropertyOptional({ type: EmergencyContactDto }) emergencyContact?: EmergencyContactDto;
  @ApiPropertyOptional() allergies?: string;
  @ApiProperty({ description: 'False until the user saves their profile; required to sign up for events' })
  profileComplete: boolean;

  /** The user's own view: includes their private profile fields. */
  static from(user: UserDocument): UserDto {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: avatarUrlOf(user),
      role: user.role,
      hasUploadedAvatar: !!user.avatarKey,
      username: user.username,
      phone: user.phone,
      emergencyContact: user.emergencyContact && { name: user.emergencyContact.name, phone: user.emergencyContact.phone },
      allergies: user.allergies,
      profileComplete: !!user.profileCompletedAt,
    };
  }
}
