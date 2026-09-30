import { formatEventDate, isPast, type EventItem } from '@events/shared';
import { Calendar, MapPin } from '@tamagui/lucide-icons-2';
import { Card, H4, Image, Text, XStack, YStack } from 'tamagui';
import { CapacityBar } from './CapacityBar';
import { Pill, StatusBadge } from './StatusBadge';

export interface EventCardProps {
  event: EventItem;
  /** Absolute image URL (resolved by the caller, since it depends on the API origin). */
  imageUri: string;
  onPress?: () => void;
}

export function EventCard({ event, imageUri, onPress }: EventCardProps) {
  return (
    <Card
      borderWidth={1}
      borderColor="$borderColor"
      overflow="hidden"
      onPress={onPress}
      cursor={onPress ? 'pointer' : undefined}
      hoverStyle={{ borderColor: '$color8' }}
      pressStyle={{ scale: 0.99 }}
      transition="quick"
    >
      <Image src={imageUri} width="100%" aspectRatio={16 / 9} objectFit="cover" alt="" />
      <YStack p="$4" gap="$3">
        <XStack gap="$2" flexWrap="wrap">
          {event.myStatus && <StatusBadge status={event.myStatus} waitlistPosition={event.myWaitlistPosition} />}
          {isPast(event) && <Pill label="Past" />}
        </XStack>
        <H4 numberOfLines={2}>{event.name}</H4>
        <YStack gap="$1.5">
          <IconLine icon={<Calendar size={14} color="$color10" />} text={formatEventDate(event.startsAt)} />
          <IconLine icon={<MapPin size={14} color="$color10" />} text={event.address} />
        </YStack>
        <CapacityBar event={event} />
      </YStack>
    </Card>
  );
}

export function IconLine({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <XStack gap="$2" items="center">
      {icon}
      <Text fontSize="$3" color="$color11" flex={1} numberOfLines={1}>
        {text}
      </Text>
    </XStack>
  );
}
