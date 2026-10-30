import { MAX_RATING, type Review, type ReviewInput, type Reviews } from '@events/shared';
import { Pencil, Star, Trash2 } from '@tamagui/lucide-icons-2';
import { useState } from 'react';
import { Avatar, Button, H5, Paragraph, Separator, Spinner, Text, TextArea, Theme, useTheme, XStack, YStack } from 'tamagui';
import { initials } from './AttendeeList';

const MAX_COMMENT_LENGTH = 2000;
const STARS = Array.from({ length: MAX_RATING }, (_, i) => i + 1);

export interface EventReviewsProps {
  reviews: Reviews;
  currentUserId?: string;
  /** Set when the current user may write a review (confirmed attendee of a started event). */
  onSave?: (input: ReviewInput) => void;
  savePending?: boolean;
  /** Deletes a review: the user's own, or anyone's for admins (see `canModerate`). */
  onDelete?: (userId: string) => void;
  deletePending?: boolean;
  canModerate?: boolean;
}

export function EventReviews({
  reviews,
  currentUserId,
  onSave,
  savePending,
  onDelete,
  deletePending,
  canModerate,
}: EventReviewsProps) {
  const mine = reviews.reviews.find((r) => r.userId === currentUserId);
  const [editing, setEditing] = useState(false);
  const showForm = !!onSave && (!mine || editing);

  return (
    <YStack gap="$4">
      <XStack gap="$3" items="center" flexWrap="wrap">
        <H5>Reviews</H5>
        {reviews.average !== null && (
          <XStack gap="$2" items="center">
            <Stars rating={reviews.average} size={16} />
            <Text fontWeight="600">{reviews.average.toFixed(1)}</Text>
            <Text color="$color10" fontSize="$2">
              ({reviews.count} {reviews.count === 1 ? 'rating' : 'ratings'})
            </Text>
          </XStack>
        )}
      </XStack>

      {showForm && (
        <ReviewForm
          key={mine?.updatedAt ?? 'new'}
          initial={mine}
          pending={savePending}
          onSubmit={(input) => {
            onSave(input);
            setEditing(false);
          }}
          onCancel={mine ? () => setEditing(false) : undefined}
        />
      )}

      {reviews.count === 0 && !showForm && <Paragraph color="$color10">No reviews yet.</Paragraph>}

      {reviews.reviews.map((review, i) => (
        <YStack key={review.userId} gap="$4">
          {i > 0 && <Separator />}
          <ReviewItem
            review={review}
            isMine={review.userId === currentUserId}
            onEdit={onSave && review.userId === currentUserId && !editing ? () => setEditing(true) : undefined}
            onDelete={
              onDelete && (review.userId === currentUserId || canModerate) ? () => onDelete(review.userId) : undefined
            }
            deletePending={deletePending}
          />
        </YStack>
      ))}
    </YStack>
  );
}

function ReviewForm({
  initial,
  pending,
  onSubmit,
  onCancel,
}: {
  initial?: Review;
  pending?: boolean;
  onSubmit: (input: ReviewInput) => void;
  onCancel?: () => void;
}) {
  // Null until picked, so "0 stars" is a deliberate choice rather than the default.
  const [rating, setRating] = useState<number | null>(initial?.rating ?? null);
  const [comment, setComment] = useState(initial?.comment ?? '');

  return (
    <YStack gap="$2.5" p="$3" rounded="$4" borderWidth={1} borderColor="$borderColor">
      <Text fontWeight="600">{initial ? 'Edit your review' : 'How was it?'}</Text>
      <StarPicker value={rating} onChange={setRating} />
      <TextArea
        value={comment}
        onChangeText={setComment}
        placeholder="Leave a public comment (optional)"
        placeholderTextColor="$color8"
        maxLength={MAX_COMMENT_LENGTH}
        minH={80}
      />
      <XStack gap="$2" justify="flex-end">
        {onCancel && (
          <Button size="$3" chromeless onPress={onCancel}>
            Cancel
          </Button>
        )}
        <Button
          size="$3"
          theme="accent"
          disabled={rating === null || pending}
          icon={pending ? <Spinner /> : undefined}
          onPress={() => rating !== null && onSubmit({ rating, comment: comment.trim() })}
        >
          {initial ? 'Save' : 'Post review'}
        </Button>
      </XStack>
    </YStack>
  );
}

function ReviewItem({
  review,
  isMine,
  onEdit,
  onDelete,
  deletePending,
}: {
  review: Review;
  isMine: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
  deletePending?: boolean;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  return (
    <YStack gap="$2">
      <XStack gap="$3" items="center">
        <Avatar circular size="$3">
          {review.avatarUrl && <Avatar.Image src={review.avatarUrl} />}
          <Avatar.Fallback bg="$color5" items="center" justify="center">
            <Text fontSize="$2" fontWeight="600">
              {initials(review.name)}
            </Text>
          </Avatar.Fallback>
        </Avatar>
        <YStack flex={1} gap="$1">
          <Text fontWeight={isMine ? '700' : '400'}>
            {review.name}
            {isMine ? ' (you)' : ''}
          </Text>
          <Stars rating={review.rating} size={14} />
        </YStack>
        {onEdit && (
          <Button size="$2" chromeless icon={<Pencil size={14} />} onPress={onEdit}>
            Edit
          </Button>
        )}
        {onDelete &&
          (confirmDelete ? (
            <XStack gap="$1">
              <Button size="$2" theme="red" disabled={deletePending} onPress={onDelete}>
                Delete?
              </Button>
              <Button size="$2" chromeless onPress={() => setConfirmDelete(false)}>
                Keep
              </Button>
            </XStack>
          ) : (
            <Button
              size="$2"
              chromeless
              theme="red"
              icon={<Trash2 size={14} />}
              aria-label={`Delete review by ${review.name}`}
              onPress={() => setConfirmDelete(true)}
            />
          ))}
      </XStack>
      {review.comment && <Paragraph whiteSpace="pre-wrap">{review.comment}</Paragraph>}
    </YStack>
  );
}

/** Read-only stars; a fractional rating (e.g. the average) rounds to the nearest whole star. */
export function Stars({ rating, size = 16 }: { rating: number; size?: number }) {
  const filled = Math.round(rating);
  return (
    <Theme name="yellow">
      <XStack gap="$0.5" role="img" aria-label={`${rating.toFixed(1)} out of ${MAX_RATING} stars`}>
        {STARS.map((n) => (
          <StarIcon key={n} filled={n <= filled} size={size} />
        ))}
      </XStack>
    </Theme>
  );
}

function StarPicker({ value, onChange }: { value: number | null; onChange: (rating: number) => void }) {
  return (
    <XStack gap="$1" items="center" flexWrap="wrap">
      <Button
        size="$2"
        rounded="$10"
        chromeless={value !== 0}
        borderWidth={1}
        borderColor="$borderColor"
        aria-pressed={value === 0}
        onPress={() => onChange(0)}
      >
        0 stars
      </Button>
      <Theme name="yellow">
        {STARS.map((n) => (
          <Button
            key={n}
            size="$3"
            circular
            chromeless
            aria-label={`${n} ${n === 1 ? 'star' : 'stars'}`}
            aria-pressed={value === n}
            icon={<StarIcon filled={value !== null && n <= value} size={22} />}
            onPress={() => onChange(n)}
          />
        ))}
      </Theme>
    </XStack>
  );
}

function StarIcon({ filled, size }: { filled: boolean; size: number }) {
  // `fill` goes straight to the SVG, so it needs a resolved color, not a token.
  const theme = useTheme();
  return <Star size={size} color={filled ? '$color9' : '$color7'} fill={filled ? theme.color9.val : 'none'} />;
}
