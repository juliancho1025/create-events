import { availabilityLabel, type EventItem } from '@events/shared';
import { Text, Theme, XStack, YStack } from 'tamagui';

export function CapacityBar({ event }: { event: EventItem }) {
  const ratio = Math.min(1, event.confirmedCount / event.capacity);
  const full = ratio >= 1;
  return (
    <YStack gap="$1.5">
      <Theme name={full ? 'red' : 'green'}>
        <XStack height={6} rounded="$10" bg="$color4" overflow="hidden">
          <YStack width={`${ratio * 100}%`} bg="$color9" />
        </XStack>
      </Theme>
      <Text fontSize="$2" color="$color10">
        {availabilityLabel(event)}
      </Text>
    </YStack>
  );
}
