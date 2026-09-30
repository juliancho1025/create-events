// Mirrors the API's response DTOs (see /api/docs for the OpenAPI contract).

export type Role = 'ADMIN' | 'USER';
export type RegistrationStatus = 'CONFIRMED' | 'WAITLISTED';
export type EventScope = 'upcoming' | 'past' | 'all';

export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  role: Role;
}

export interface EventItem {
  id: string;
  name: string;
  address: string;
  description: string;
  /** Relative to the API origin; resolve with `api.resolveUrl()`. */
  imageUrl: string;
  startsAt: string;
  capacity: number;
  confirmedCount: number;
  waitlistCount: number;
  myStatus: RegistrationStatus | null;
  myWaitlistPosition: number | null;
}

export interface Attendee {
  userId: string;
  name: string;
  avatarUrl?: string;
  email?: string;
  registeredAt: string;
}

export interface Attendees {
  confirmed: Attendee[];
  waitlist: Attendee[];
}

export interface RegistrationResult {
  status: RegistrationStatus;
  waitlistPosition: number | null;
}

export interface AuthProviders {
  google: boolean;
  dev: boolean;
}

/**
 * A file to upload. On the web this is a `File`/`Blob`; in React Native it is
 * the `{ uri, name, type }` object that RN's FormData understands.
 */
export type UploadableImage = Blob | { uri: string; name: string; type: string };

export interface EventInput {
  name: string;
  address: string;
  description: string;
  startsAt: Date;
  capacity: number;
  /** Required on create, optional on update. */
  image?: UploadableImage;
}
