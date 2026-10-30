import { Body, Controller, Delete, Get, HttpCode, Param, Put } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser, Roles } from '../common/decorators.js';
import { ParseObjectIdPipe } from '../common/parse-object-id.pipe.js';
import { Role, type AuthUser } from '../common/roles.js';
import { ReviewDto, ReviewsDto, UpsertReviewDto } from './reviews.dto.js';
import { ReviewsService } from './reviews.service.js';

@ApiTags('reviews')
@ApiBearerAuth()
@Controller('events/:eventId/reviews')
export class ReviewsController {
  constructor(private readonly reviews: ReviewsService) {}

  @Get()
  @ApiOperation({ summary: 'Public ratings and comments, with the average' })
  @ApiOkResponse({ type: ReviewsDto })
  list(@Param('eventId', ParseObjectIdPipe) eventId: string): Promise<ReviewsDto> {
    return this.reviews.list(eventId);
  }

  @Put('me')
  @ApiOperation({ summary: 'Rate the event 0-5 stars with an optional comment (confirmed attendees, after it starts)' })
  @ApiOkResponse({ type: ReviewDto })
  @ApiBadRequestResponse({ description: 'Event has not started yet' })
  @ApiForbiddenResponse({ description: 'Requester was not a confirmed attendee' })
  upsert(
    @Param('eventId', ParseObjectIdPipe) eventId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: UpsertReviewDto,
  ): Promise<ReviewDto> {
    return this.reviews.upsert(eventId, user.id, dto);
  }

  @Delete('me')
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete the current user review' })
  @ApiNoContentResponse()
  @ApiNotFoundResponse({ description: 'No review to delete' })
  removeMine(@Param('eventId', ParseObjectIdPipe) eventId: string, @CurrentUser() user: AuthUser) {
    return this.reviews.remove(eventId, user.id);
  }

  // Declared after `me` so "me" never reaches the ObjectId pipe.
  @Delete(':userId')
  @Roles(Role.ADMIN)
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete an attendee review (admin moderation)' })
  @ApiNoContentResponse()
  @ApiNotFoundResponse({ description: 'No review to delete' })
  remove(
    @Param('eventId', ParseObjectIdPipe) eventId: string,
    @Param('userId', ParseObjectIdPipe) userId: string,
  ) {
    return this.reviews.remove(eventId, userId);
  }
}
