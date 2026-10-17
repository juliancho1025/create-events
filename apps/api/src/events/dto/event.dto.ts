import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsDate,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { EventMetricDto } from '../../metrics/metrics.dto.js';
import { RegistrationStatus } from '../../registrations/registration.schema.js';

/** Multipart can't carry arrays of strings reliably, so `metrics` arrives as a JSON string. */
const parseJsonArray = ({ value }: { value: unknown }) => {
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return value; // fails @IsArray with a readable message
  }
};

/**
 * Sent as multipart/form-data together with an `image` file, so numbers and
 * dates arrive as strings and are converted by @Type (class-transformer).
 */
export class CreateEventDto {
  @ApiProperty({ maxLength: 120 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name: string;

  @ApiProperty({ maxLength: 300 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  address: string;

  @ApiProperty({ maxLength: 5000 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  description: string;

  @ApiProperty({ type: String, format: 'date-time' })
  @Type(() => Date)
  @IsDate()
  startsAt: Date;

  @ApiProperty({ minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  capacity: number;

  @ApiPropertyOptional({
    type: String,
    description: 'JSON array of metric names, e.g. ["No-show","Tardiness"]. Omit for none (create) / unchanged (update).',
  })
  @IsOptional()
  @Transform(parseJsonArray)
  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  @MaxLength(40, { each: true })
  metrics?: string[];
}

export class UpdateEventDto extends PartialType(CreateEventDto) {}

export class EventDto {
  @ApiProperty() id: string;
  @ApiProperty() name: string;
  @ApiProperty() address: string;
  @ApiProperty() description: string;
  @ApiProperty({ description: 'Path to the image, relative to the API origin' }) imageUrl: string;
  @ApiProperty({ type: String, format: 'date-time' }) startsAt: string;
  @ApiProperty() capacity: number;
  @ApiProperty() confirmedCount: number;
  @ApiProperty() waitlistCount: number;
  @ApiProperty({ type: [EventMetricDto] }) metrics: EventMetricDto[];
  @ApiPropertyOptional({ enum: RegistrationStatus, nullable: true })
  myStatus: RegistrationStatus | null;
  @ApiPropertyOptional({ nullable: true, description: '1-based position if waitlisted' })
  myWaitlistPosition: number | null;
}

export class AttendeeDto {
  @ApiProperty() userId: string;
  @ApiProperty() name: string;
  @ApiPropertyOptional() avatarUrl?: string;
  @ApiPropertyOptional({ description: 'Only included for admins' }) email?: string;
  @ApiProperty({ type: String, format: 'date-time' }) registeredAt: string;
  @ApiPropertyOptional({ type: [String], description: 'Marked metric keys; only included for admins' })
  metrics?: string[];
}

export class AttendeesDto {
  @ApiProperty({ type: [AttendeeDto] }) confirmed: AttendeeDto[];
  @ApiProperty({ type: [AttendeeDto], description: 'In waitlist order' }) waitlist: AttendeeDto[];
}

export class RegistrationDto {
  @ApiProperty({ enum: RegistrationStatus }) status: RegistrationStatus;
  @ApiPropertyOptional({ nullable: true }) waitlistPosition: number | null;
}
