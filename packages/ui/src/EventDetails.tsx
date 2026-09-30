import { formatEventDate, isPast, type EventItem } from '@events/shared';
import { Calendar, MapPin } from '@tamagui/lucide-icons-2';
import type { ReactNode } from 'react';
import { Button, H2, Image, Paragraph, Spinner, XStack, YStack } from 'tamagui';
import { CapacityBar } from './CapacityBar';
import { IconLine } from './EventCard';
import { Pill, StatusBadge } from './StatusBadge';

export interface EventDetailsProps {
  event: EventItem;
  imageUri: string;
  onRegister: () => void;
  onCancel: () => void;
  pending?: boolean;
  /** Extra actions (e.g. admin edit/delete), rendered next to the sign-up button. */
  actions?: ReactNode;
}

export function EventDetails({ event, imageUri, onRegister, onCancel, pending, actions }: EventDetailsProps) {
  const past = isPast(event);
  const full = event.confirmedCount >= event.capacity;

  return (
    <YStack gap="$4">
      <Image src={imageUri} width="100%" aspectRatio={21 / 9} objectFit="cover" rounded="$6" alt="" />
      <YStack gap="$3">
        <XStack gap="$2" flexWrap="wrap">
          {event.myStatus && <StatusBadge status={event.myStatus} waitlistPosition={event.myWaitlistPosition} />}
          {past && <Pill label="Past" />}
        </XStack>
        <H2>{event.name}</H2>
        <IconLine icon={<Calendar size={16} color="$color10" />} text={formatEventDate(event.startsAt)} />
        <IconLine icon={<MapPin size={16} color="$color10" />} text={event.address} />
        <CapacityBar event={event} />
      </YStack>

      <XStack gap="$3" flexWrap="wrap" items="center">
        {!past &&
          (event.myStatus ? (
            <Button theme="red" onPress={onCancel} disabled={pending} icon={pending ? <Spinner /> : undefined}>
              {event.myStatus === 'WAITLISTED' ? 'Leave waitlist' : 'Cancel my spot'}
            </Button>
          ) : (
            <Button theme="accent" onPress={onRegister} disabled={pending} icon={pending ? <Spinner /> : undefined}>
              {full ? 'Join waitlist' : 'Sign up'}
            </Button>
          ))}
        {actions}
      </XStack>

      <Paragraph whiteSpace="pre-wrap">{event.description}</Paragraph>
    </YStack>
  );
}
