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
  metrics: EventMetric[];
}

export interface EventMetric {
  /** Slug of the label, e.g. 'no-show'. Same key on different events = same metric. */
  key: string;
  label: string;
}

/** Pre-selected when creating an event; admins can remove them or add their own. */
export const RECOMMENDED_METRICS = ['No-show', 'Tardiness', 'Late payment'];

export interface Attendee {
  userId: string;
  name: string;
  avatarUrl?: string;
  email?: string;
  registeredAt: string;
  /** Marked metric keys. Admins only. */
  metrics?: string[];
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
  /** Metric names to track. */
  metrics: string[];
  /** Required on create, optional on update. */
  image?: UploadableImage;
}

export interface MetricCount {
  count: number;
  /** Tracked attendances: the rate denominator. */
  opportunities: number;
}

export interface MetricsReport {
  metrics: EventMetric[];
  users: { userId: string; name: string; email: string; avatarUrl?: string; stats: Record<string, MetricCount> }[];
  /** Oldest first. */
  events: { eventId: string; name: string; startsAt: string; stats: Record<string, MetricCount> }[];
}
