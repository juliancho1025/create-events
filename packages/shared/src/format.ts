import type { EventItem } from './types';

const dateFormat = new Intl.DateTimeFormat(undefined, {
  weekday: 'short',
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
});

export const formatEventDate = (iso: string) => dateFormat.format(new Date(iso));

export const isPast = (event: Pick<EventItem, 'startsAt'>) => new Date(event.startsAt).getTime() <= Date.now();

export const seatsLeft = (event: Pick<EventItem, 'capacity' | 'confirmedCount'>) =>
  Math.max(0, event.capacity - event.confirmedCount);

export function availabilityLabel(event: EventItem): string {
  const left = seatsLeft(event);
  if (left > 0) return `${left} of ${event.capacity} seats left`;
  return event.waitlistCount > 0 ? `Full · ${event.waitlistCount} on waitlist` : 'Full · waitlist open';
}

/**
 * Splits what the creator typed ("ada@x.com, @bob carol") into emails and usernames.
 * Anything with an "@" after the first character is an email; a leading "@" marks a username.
 */
export function parsePeople(text: string): { emails: string[]; usernames: string[] } {
  const emails: string[] = [];
  const usernames: string[] = [];
  for (const token of text.split(/[\s,;]+/).filter(Boolean)) {
    if (token.indexOf('@', 1) > 0) emails.push(token.toLowerCase());
    else usernames.push(token.replace(/^@/, '').toLowerCase());
  }
  return { emails: [...new Set(emails)], usernames: [...new Set(usernames.filter(Boolean))] };
}
