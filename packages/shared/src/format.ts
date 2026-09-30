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
