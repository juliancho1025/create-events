import { Controller, Delete, Get, HttpCode, Param, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiNoContentResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Roles } from '../common/decorators.js';
import { ParseObjectIdPipe } from '../common/parse-object-id.pipe.js';
import { Role, type AuthUser } from '../common/roles.js';
import { MetricsReportDto } from './metrics.dto.js';
import { MetricsService } from './metrics.service.js';

@ApiTags('metrics')
@ApiBearerAuth()
@Roles(Role.ADMIN)
@Controller()
export class MetricsController {
  constructor(private readonly metrics: MetricsService) {}

  @Put('events/:eventId/metrics/:metric/users/:userId')
  @HttpCode(204)
  @ApiOperation({ summary: 'Mark a confirmed attendee with a metric, e.g. no-show (admin)' })
  @ApiNoContentResponse()
  mark(
    @Param('eventId', ParseObjectIdPipe) eventId: string,
    @Param('metric') metric: string,
    @Param('userId', ParseObjectIdPipe) userId: string,
    @CurrentUser() admin: AuthUser,
  ): Promise<void> {
    return this.metrics.mark(eventId, metric, userId, admin.id);
  }

  @Delete('events/:eventId/metrics/:metric/users/:userId')
  @HttpCode(204)
  @ApiOperation({ summary: 'Clear a metric mark (admin)' })
  @ApiNoContentResponse()
  unmark(
    @Param('eventId', ParseObjectIdPipe) eventId: string,
    @Param('metric') metric: string,
    @Param('userId', ParseObjectIdPipe) userId: string,
  ): Promise<void> {
    return this.metrics.unmark(eventId, metric, userId);
  }

  @Get('metrics/report')
  @ApiOperation({ summary: 'Per-user and per-event metric counts across started events (admin)' })
  @ApiOkResponse({ type: MetricsReportDto })
  report(): Promise<MetricsReportDto> {
    return this.metrics.report();
  }
}
