import { Controller, Get, Param } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../common/decorators.js';
import { ParseObjectIdPipe } from '../common/parse-object-id.pipe.js';
import { Role } from '../common/roles.js';
import { ScheduledNotificationDto } from './notifications.dto.js';
import { NotificationsService } from './notifications.service.js';

/** Notifications are written through the event's create/update form (`notifications` field). */
@ApiTags('notifications')
@ApiBearerAuth()
@Roles(Role.ADMIN)
@Controller('events/:eventId/notifications')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: "The event's programmed notifications, pending and sent (admin)" })
  @ApiOkResponse({ type: [ScheduledNotificationDto] })
  list(@Param('eventId', ParseObjectIdPipe) eventId: string): Promise<ScheduledNotificationDto[]> {
    return this.notifications.list(eventId);
  }
}
