import type { Locale, Messages } from './i18n';
import type { EventItem } from './types';

const dateFormats = new Map<Locale, Intl.DateTimeFormat>();

/** "Sat, Jan 15, 2027, 6:30 PM" / "sáb, 15 de ene de 2027, 18:30" in the given language. */
export function formatEventDate(iso: string, locale: Locale): string {
  let format = dateFormats.get(locale);
  if (!format) {
    format = new Intl.DateTimeFormat(locale, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
    dateFormats.set(locale, format);
  }
  return format.format(new Date(iso));
}

export const isPast = (event: Pick<EventItem, 'startsAt'>) => new Date(event.startsAt).getTime() <= Date.now();

export const seatsLeft = (event: Pick<EventItem, 'capacity' | 'confirmedCount'>) =>
  Math.max(0, event.capacity - event.confirmedCount);

export function availabilityLabel(event: EventItem, t: Messages): string {
  const left = seatsLeft(event);
  if (left > 0) return t.event.seatsLeft(left, event.capacity);
  return event.waitlistCount > 0 ? t.event.fullWithWaitlist(event.waitlistCount) : t.event.fullWaitlistOpen;
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
