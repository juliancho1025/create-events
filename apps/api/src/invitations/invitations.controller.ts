import { Body, Controller, Delete, Get, HttpCode, Param, Post } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators.js';
import { ParseObjectIdPipe } from '../common/parse-object-id.pipe.js';
import type { AuthUser } from '../common/roles.js';
import { AddPeopleDto, AddPersonResultDto, InvitationDto } from './invitations.dto.js';
import { InvitationsService } from './invitations.service.js';

@ApiTags('invitations')
@ApiBearerAuth()
@Controller('events/:eventId/invitations')
export class InvitationsController {
  constructor(private readonly invitations: InvitationsService) {}

  @Post()
  @HttpCode(200)
  @ApiOperation({
    summary: 'Add people by email and/or username (event creator only)',
    description:
      'Users with a saved profile are signed up now (seat or waitlist). Unknown emails, and users without a ' +
      'profile, get a pending invitation and an email with a link; they are signed up when they save their profile.',
  })
  @ApiOkResponse({ type: [AddPersonResultDto], description: 'One result per email/username sent' })
  @ApiForbiddenResponse({ description: 'Requester did not create the event' })
  @ApiBadRequestResponse({ description: 'Event already started, or nothing to add' })
  add(
    @Param('eventId', ParseObjectIdPipe) eventId: string,
    @Body() dto: AddPeopleDto,
    @CurrentUser() user: AuthUser,
  ): Promise<AddPersonResultDto[]> {
    return this.invitations.add(eventId, dto, user);
  }

  @Get()
  @ApiOperation({ summary: 'Pending invitations (event creator only)' })
  @ApiOkResponse({ type: [InvitationDto] })
  list(@Param('eventId', ParseObjectIdPipe) eventId: string, @CurrentUser() user: AuthUser): Promise<InvitationDto[]> {
    return this.invitations.list(eventId, user);
  }

  @Delete(':email')
  @HttpCode(204)
  @ApiOperation({ summary: 'Revoke a pending invitation (event creator only)' })
  @ApiNoContentResponse()
  revoke(
    @Param('eventId', ParseObjectIdPipe) eventId: string,
    @Param('email') email: string,
    @CurrentUser() user: AuthUser,
  ): Promise<void> {
    return this.invitations.revoke(eventId, email, user);
  }
}
