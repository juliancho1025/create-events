import type { Types } from 'mongoose';
import type { User } from './user.schema.js';

/** Fields to select/populate wherever an avatar is shown. */
export const AVATAR_FIELDS = 'avatarUrl avatarKey';

/**
 * The URL to show: the uploaded photo (relative to the API origin, versioned
 * by its key so it can be cached forever), else Google's picture, else none.
 */
export function avatarUrlOf(user: Pick<User, 'avatarUrl' | 'avatarKey'> & { _id: Types.ObjectId }): string | undefined {
  if (user.avatarKey) {
    return `/api/users/${user._id.toString()}/avatar?v=${encodeURIComponent(user.avatarKey.split('/').pop()!)}`;
  }
  return user.avatarUrl;
}
