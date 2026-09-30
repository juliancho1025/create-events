import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate, IsInt, IsNotEmpty, IsString, MaxLength, Min } from 'class-validator';
import { RegistrationStatus } from '../../registrations/registration.schema.js';

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
}

export class AttendeesDto {
  @ApiProperty({ type: [AttendeeDto] }) confirmed: AttendeeDto[];
  @ApiProperty({ type: [AttendeeDto], description: 'In waitlist order' }) waitlist: AttendeeDto[];
}

export class RegistrationDto {
  @ApiProperty({ enum: RegistrationStatus }) status: RegistrationStatus;
  @ApiPropertyOptional({ nullable: true }) waitlistPosition: number | null;
}
