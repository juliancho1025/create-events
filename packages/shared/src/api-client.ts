import type {
  Attendees,
  AuthProviders,
  EventInput,
  EventItem,
  EventScope,
  RegistrationResult,
  User,
} from './types';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export interface ApiClientOptions {
  /** '' on the web (same origin via dev proxy), e.g. 'https://api.example.com' on mobile. */
  baseUrl: string;
  getToken: () => string | null;
  onUnauthorized?: () => void;
}

export type ApiClient = ReturnType<typeof createApiClient>;

/** Plain fetch-based client: works unchanged in browsers and React Native. */
export function createApiClient({ baseUrl, getToken, onUnauthorized }: ApiClientOptions) {
  async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const headers = new Headers(init.headers);
    const token = getToken();
    if (token) headers.set('Authorization', `Bearer ${token}`);
    if (init.body && !(init.body instanceof FormData)) headers.set('Content-Type', 'application/json');

    const res = await fetch(`${baseUrl}/api${path}`, { ...init, headers });
    if (res.status === 401 && token) onUnauthorized?.();
    if (!res.ok) {
      // NestJS error shape; `message` is an array for validation errors.
      const body = (await res.json().catch(() => null)) as { message?: string | string[] } | null;
      const message = Array.isArray(body?.message) ? body.message.join('\n') : body?.message;
      throw new ApiError(res.status, message ?? res.statusText, body);
    }
    return (res.status === 204 ? undefined : await res.json()) as T;
  }

  function toFormData(input: Partial<EventInput>): FormData {
    const form = new FormData();
    if (input.name !== undefined) form.append('name', input.name);
    if (input.address !== undefined) form.append('address', input.address);
    if (input.description !== undefined) form.append('description', input.description);
    if (input.startsAt !== undefined) form.append('startsAt', input.startsAt.toISOString());
    if (input.capacity !== undefined) form.append('capacity', String(input.capacity));
    // RN's FormData accepts { uri, name, type }; the DOM typings only know Blob.
    if (input.image) form.append('image', input.image as Blob);
    return form;
  }

  return {
    resolveUrl: (path: string) => `${baseUrl}${path}`,
    googleLoginUrl: () => `${baseUrl}/api/auth/google`,

    authProviders: () => request<AuthProviders>('/auth/providers'),
    devLogin: (email: string, name: string) =>
      request<{ accessToken: string; user: User }>('/auth/dev-login', {
        method: 'POST',
        body: JSON.stringify({ email, name }),
      }),
    me: () => request<User>('/users/me'),

    listEvents: (scope: EventScope = 'upcoming') => request<EventItem[]>(`/events?scope=${scope}`),
    getEvent: (id: string) => request<EventItem>(`/events/${id}`),
    createEvent: (input: EventInput) =>
      request<EventItem>('/events', { method: 'POST', body: toFormData(input) }),
    updateEvent: (id: string, input: Partial<EventInput>) =>
      request<EventItem>(`/events/${id}`, { method: 'PATCH', body: toFormData(input) }),
    deleteEvent: (id: string) => request<void>(`/events/${id}`, { method: 'DELETE' }),

    register: (eventId: string) =>
      request<RegistrationResult>(`/events/${eventId}/registrations`, { method: 'POST' }),
    cancelRegistration: (eventId: string) =>
      request<void>(`/events/${eventId}/registrations/me`, { method: 'DELETE' }),
    attendees: (eventId: string) => request<Attendees>(`/events/${eventId}/attendees`),
  };
}
