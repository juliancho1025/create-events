import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Event } from '../events/event.schema.js';
import { Registration, RegistrationStatus } from '../registrations/registration.schema.js';
import { AVATAR_FIELDS, avatarUrlOf } from '../users/avatar.js';
import type { User } from '../users/user.schema.js';
import { Review } from './review.schema.js';
import type { ReviewDto, ReviewsDto, UpsertReviewDto } from './reviews.dto.js';

@Injectable()
export class ReviewsService {
  constructor(
    @InjectModel(Review.name) private readonly reviewModel: Model<Review>,
    @InjectModel(Event.name) private readonly eventModel: Model<Event>,
    @InjectModel(Registration.name) private readonly registrationModel: Model<Registration>,
  ) {}

  /** Creates or edits the caller's review. Only confirmed attendees, once the event has started. */
  async upsert(eventId: string, userId: string, dto: UpsertReviewDto): Promise<ReviewDto> {
    const event = await this.eventModel.findById(eventId, { startsAt: 1 });
    if (!event) throw new NotFoundException('Event not found');
    if (event.startsAt.getTime() > Date.now()) {
      throw new BadRequestException('You can rate this event once it has started');
    }
    const confirmed = await this.registrationModel.exists({
      event: eventId,
      user: userId,
      status: RegistrationStatus.CONFIRMED,
    });
    if (!confirmed) throw new ForbiddenException('Only attendees can rate this event');

    await this.reviewModel.updateOne(
      { event: eventId, user: userId },
      { $set: { rating: dto.rating, comment: dto.comment?.trim() ?? '' } },
      { upsert: true, runValidators: true },
    );
    const { reviews } = await this.list(eventId, userId);
    return reviews.find((r) => r.userId === userId)!;
  }

  /** Public to every signed-in user, attendee or not. */
  async list(eventId: string, onlyUserId?: string): Promise<ReviewsDto> {
    if (!(await this.eventModel.exists({ _id: eventId }))) throw new NotFoundException('Event not found');
    const reviews = await this.reviewModel
      .find({ event: eventId, ...(onlyUserId && { user: onlyUserId }) })
      .sort({ updatedAt: -1, _id: -1 })
      .populate<{ user: (User & { _id: Types.ObjectId }) | null }>('user', `name ${AVATAR_FIELDS}`);

    const dtos: ReviewDto[] = reviews
      .filter((r) => r.user) // skip reviews of users that no longer exist
      .map((r) => ({
        userId: r.user!._id.toString(),
        name: r.user!.name,
        avatarUrl: avatarUrlOf(r.user!),
        rating: r.rating,
        comment: r.comment,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
      }));
    const total = dtos.reduce((sum, r) => sum + r.rating, 0);
    return { average: dtos.length ? total / dtos.length : null, count: dtos.length, reviews: dtos };
  }

  /** The author withdrawing their review, or an admin moderating someone else's. */
  async remove(eventId: string, userId: string): Promise<void> {
    const res = await this.reviewModel.deleteOne({ event: eventId, user: userId });
    if (res.deletedCount === 0) throw new NotFoundException('There is no review to delete');
  }

  async deleteForEvent(eventId: Types.ObjectId): Promise<void> {
    await this.reviewModel.deleteMany({ event: eventId });
  }
}
