import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsEmail, IsOptional, IsString, Matches } from 'class-validator';
import { USERNAME } from '../users/user.dto.js';

export const MAX_PEOPLE_PER_REQUEST = 50;

const normalizeEach =
  (fn: (s: string) => string) =>
  ({ value }: { value: unknown }) =>
    Array.isArray(value) ? value.map((v: unknown) => (typeof v === 'string' ? fn(v) : v)) : value;

export class AddPeopleDto {
  @ApiPropertyOptional({ type: [String], example: ['ada@example.com'] })
  @IsOptional()
  @Transform(normalizeEach((s) => s.trim().toLowerCase()))
  @IsArray()
  @ArrayMaxSize(MAX_PEOPLE_PER_REQUEST)
  @IsEmail({}, { each: true })
  emails?: string[];

  @ApiPropertyOptional({ type: [String], example: ['ada.lovelace'], description: 'With or without a leading "@"' })
  @IsOptional()
  @Transform(normalizeEach((s) => s.trim().replace(/^@/, '').toLowerCase()))
  @IsArray()
  @ArrayMaxSize(MAX_PEOPLE_PER_REQUEST)
  @IsString({ each: true })
  @Matches(USERNAME, { each: true, message: 'each username may only contain letters, numbers, "_" and "."' })
  usernames?: string[];
}

export enum AddPersonStatus {
  /** Signed up now, with a seat. */
  CONFIRMED = 'CONFIRMED',
  /** Signed up now, on the waitlist (the event is full). */
  WAITLISTED = 'WAITLISTED',
  ALREADY_REGISTERED = 'ALREADY_REGISTERED',
  /** No account with that email: an invitation with a sign-up link was emailed. */
  INVITED = 'INVITED',
  /** Has an account but no profile yet: signed up as soon as they save it (also emailed). */
  PENDING_PROFILE = 'PENDING_PROFILE',
  /** No user with that username. */
  NOT_FOUND = 'NOT_FOUND',
}

export class AddPersonResultDto {
  @ApiProperty({ description: 'The email or username as sent (normalized)' }) input: string;
  @ApiProperty({ enum: AddPersonStatus }) status: AddPersonStatus;
  @ApiPropertyOptional({ description: 'Display name, when the input matched a user' }) name?: string;
  @ApiPropertyOptional({ description: 'For INVITED / PENDING_PROFILE: whether the email went out' })
  emailSent?: boolean;
}

export class InvitationDto {
  @ApiProperty() email: string;
  @ApiProperty({ type: String, format: 'date-time' }) invitedAt: string;
}
