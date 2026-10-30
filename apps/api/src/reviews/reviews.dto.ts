import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { MAX_RATING, MIN_RATING } from './review.schema.js';

export class UpsertReviewDto {
  @ApiProperty({ minimum: MIN_RATING, maximum: MAX_RATING, description: 'Whole stars' })
  @IsInt()
  @Min(MIN_RATING)
  @Max(MAX_RATING)
  rating: number;

  @ApiPropertyOptional({ maxLength: 2000, description: 'Public comment; empty or omitted for none' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  comment?: string;
}

export class ReviewDto {
  @ApiProperty() userId: string;
  @ApiProperty() name: string;
  @ApiPropertyOptional() avatarUrl?: string;
  @ApiProperty({ minimum: MIN_RATING, maximum: MAX_RATING }) rating: number;
  @ApiProperty({ description: 'Empty when the attendee left only stars' }) comment: string;
  @ApiProperty({ type: String, format: 'date-time' }) createdAt: string;
  @ApiProperty({ type: String, format: 'date-time' }) updatedAt: string;
}

export class ReviewsDto {
  @ApiPropertyOptional({ nullable: true, description: 'Mean rating, null when there are no reviews' })
  average: number | null;
  @ApiProperty() count: number;
  @ApiProperty({ type: [ReviewDto], description: 'Most recently written first' }) reviews: ReviewDto[];
}
