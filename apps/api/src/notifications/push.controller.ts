import { Body, Controller, Delete, Get, HttpCode, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiNoContentResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators.js';
import type { AuthUser } from '../common/roles.js';
import { PushPublicKeyDto, SubscribePushDto, UnsubscribePushDto } from './notifications.dto.js';
import { PushService } from './push.service.js';

@ApiTags('push')
@ApiBearerAuth()
@Controller('push')
export class PushController {
  constructor(private readonly push: PushService) {}

  @Get('public-key')
  @ApiOperation({ summary: 'VAPID key for PushManager.subscribe (null when push is not configured)' })
  @ApiOkResponse({ type: PushPublicKeyDto })
  publicKey(): PushPublicKeyDto {
    return { publicKey: this.push.publicKey };
  }

  @Put('subscriptions')
  @HttpCode(204)
  @ApiOperation({ summary: "Register this browser for the current user's push notifications" })
  @ApiNoContentResponse()
  subscribe(@CurrentUser() user: AuthUser, @Body() dto: SubscribePushDto): Promise<void> {
    return this.push.subscribe(user.id, dto);
  }

  @Delete('subscriptions')
  @HttpCode(204)
  @ApiOperation({ summary: 'Stop sending push notifications to this browser' })
  @ApiNoContentResponse()
  unsubscribe(@CurrentUser() user: AuthUser, @Body() dto: UnsubscribePushDto): Promise<void> {
    return this.push.unsubscribe(user.id, dto.endpoint);
  }
}
