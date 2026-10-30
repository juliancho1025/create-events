import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsObject, IsString, IsUrl, Max, MaxLength, Min, ValidateNested } from 'class-validator';
import { MAX_MINUTES_BEFORE, NotificationStatus } from './scheduled-notification.schema.js';

export class PushPublicKeyDto {
  @ApiPropertyOptional({ nullable: true, description: 'VAPID public key; null when push is not configured' })
  publicKey: string | null;
}

class PushKeysDto {
  @ApiProperty() @IsString() @IsNotEmpty() p256dh: string;
  @ApiProperty() @IsString() @IsNotEmpty() auth: string;
}

/** The browser's `PushSubscription.toJSON()`, minus `expirationTime`. */
export class SubscribePushDto {
  @ApiProperty({ example: 'https://fcm.googleapis.com/fcm/send/...' })
  @IsUrl({ protocols: ['https'], require_tld: false })
  @MaxLength(1000)
  endpoint: string;

  @ApiProperty({ type: PushKeysDto })
  @IsObject()
  @ValidateNested()
  @Type(() => PushKeysDto)
  keys: PushKeysDto;
}

export class UnsubscribePushDto {
  @ApiProperty() @IsString() @IsNotEmpty() endpoint: string;
}

export class NotificationInputDto {
  @ApiProperty({ minimum: 0, maximum: MAX_MINUTES_BEFORE, description: 'Minutes before the event starts' })
  @IsInt()
  @Min(0)
  @Max(MAX_MINUTES_BEFORE)
  minutesBefore: number;

  @ApiProperty({ maxLength: 200 })
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  message: string;
}

export class ScheduledNotificationDto {
  @ApiProperty() id: string;
  @ApiProperty() minutesBefore: number;
  @ApiProperty() message: string;
  @ApiProperty({ type: String, format: 'date-time' }) sendAt: string;
  @ApiProperty({ enum: NotificationStatus }) status: NotificationStatus;
  @ApiPropertyOptional({ type: String, format: 'date-time' }) sentAt?: string;
  @ApiPropertyOptional({ description: 'Devices it was delivered to' }) deliveredTo?: number;
}
