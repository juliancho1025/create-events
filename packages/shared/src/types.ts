// Mirrors the API's response DTOs (see /api/docs for the OpenAPI contract).

export type Role = 'ADMIN' | 'USER';
export type RegistrationStatus = 'CONFIRMED' | 'WAITLISTED';
export type EventScope = 'upcoming' | 'past' | 'all';

export interface EmergencyContact {
  name: string;
  phone: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  /** Uploaded photo (relative to the API origin, like `EventItem.imageUrl`) or the Google picture. */
  avatarUrl?: string;
  /** True when `avatarUrl` is a photo the user uploaded, so it can be removed. */
  hasUploadedAvatar: boolean;
  role: Role;
  username?: string;
  phone?: string;
  emergencyContact?: EmergencyContact;
  allergies?: string;
  /** False until the profile is saved once; signing up for events requires it. */
  profileComplete: boolean;
}

/** Whole profile (PUT): leaving an optional field out clears it. */
export interface ProfileInput {
  name: string;
  username: string;
  phone?: string;
  emergencyContact: EmergencyContact;
  allergies?: string;
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
  /** The admin who created it: only they can add people. */
  isCreator: boolean;
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
  username?: string;
  registeredAt: string;
  // Admins only:
  email?: string;
  phone?: string;
  emergencyContact?: EmergencyContact;
  allergies?: string;
  /** Marked metric keys. Admins only. */
  metrics?: string[];
}

export interface Attendees {
  confirmed: Attendee[];
  waitlist: Attendee[];
}

export const MAX_RATING = 5;

export interface Review {
  userId: string;
  name: string;
  avatarUrl?: string;
  /** Whole stars, 0 to MAX_RATING. */
  rating: number;
  /** Empty when the attendee left only stars. */
  comment: string;
  createdAt: string;
  updatedAt: string;
}

export interface Reviews {
  /** Null when nobody has rated yet. */
  average: number | null;
  count: number;
  /** Most recently written first. */
  reviews: Review[];
}

export interface ReviewInput {
  rating: number;
  comment?: string;
}

export interface RegistrationResult {
  status: RegistrationStatus;
  waitlistPosition: number | null;
}

/** People the event creator adds; usernames with or without "@". */
export interface AddPeopleInput {
  emails?: string[];
  usernames?: string[];
}

export type AddPersonStatus =
  /** Signed up now, with a seat / on the waitlist. */
  | 'CONFIRMED'
  | 'WAITLISTED'
  | 'ALREADY_REGISTERED'
  /** No account with that email: an invitation with a sign-up link was emailed. */
  | 'INVITED'
  /** Has an account but no profile yet: signed up as soon as they save it. */
  | 'PENDING_PROFILE'
  /** No user with that username. */
  | 'NOT_FOUND';

export interface AddPersonResult {
  input: string;
  status: AddPersonStatus;
  name?: string;
  emailSent?: boolean;
}

/** Waiting for the person to sign up or finish their profile. */
export interface Invitation {
  email: string;
  invitedAt: string;
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
  /** Replaces the pending programmed notifications; omit to leave them unchanged. */
  notifications?: NotificationInput[];
}

/** Max programmed notifications per event, and how far ahead of the start they can go. */
export const MAX_NOTIFICATIONS = 5;
export const MAX_MINUTES_BEFORE = 30 * 24 * 60;

export interface NotificationInput {
  /** 0 = when the event starts. */
  minutesBefore: number;
  message: string;
}

export interface ScheduledNotification extends NotificationInput {
  id: string;
  sendAt: string;
  status: 'PENDING' | 'SENT';
  sentAt?: string;
  /** Devices it reached. */
  deliveredTo?: number;
}

/** `PushSubscription.toJSON()` from the browser. */
export interface PushSubscriptionInput {
  endpoint: string;
  keys: { p256dh: string; auth: string };
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
