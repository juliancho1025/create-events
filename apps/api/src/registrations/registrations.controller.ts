import { Controller, Delete, Get, HttpCode, Param, Post } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators.js';
import { ParseObjectIdPipe } from '../common/parse-object-id.pipe.js';
import type { AuthUser } from '../common/roles.js';
import { AttendeesDto, RegistrationDto } from '../events/dto/event.dto.js';
import { RegistrationsService } from './registrations.service.js';

@ApiTags('registrations')
@ApiBearerAuth()
@Controller('events/:eventId')
export class RegistrationsController {
  constructor(private readonly registrations: RegistrationsService) {}

  @Post('registrations')
  @ApiOperation({ summary: 'Sign up the current user (confirmed or waitlisted)' })
  @ApiCreatedResponse({ type: RegistrationDto })
  @ApiConflictResponse({ description: 'Already signed up' })
  register(
    @Param('eventId', ParseObjectIdPipe) eventId: string,
    @CurrentUser() user: AuthUser,
  ): Promise<RegistrationDto> {
    return this.registrations.register(eventId, user.id);
  }

  @Delete('registrations/me')
  @HttpCode(204)
  @ApiOperation({ summary: 'Cancel the current user sign-up (promotes the waitlist)' })
  @ApiNoContentResponse()
  cancel(@Param('eventId', ParseObjectIdPipe) eventId: string, @CurrentUser() user: AuthUser) {
    return this.registrations.cancel(eventId, user.id);
  }

  @Get('attendees')
  @ApiOperation({ summary: 'Confirmed list and waitlist (admins and registered users only)' })
  @ApiOkResponse({ type: AttendeesDto })
  @ApiForbiddenResponse({ description: 'Requester is not registered for the event' })
  attendees(
    @Param('eventId', ParseObjectIdPipe) eventId: string,
    @CurrentUser() user: AuthUser,
  ): Promise<AttendeesDto> {
    return this.registrations.attendees(eventId, user);
  }
}
