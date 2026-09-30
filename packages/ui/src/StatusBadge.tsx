import type { RegistrationStatus } from '@events/shared';
import { Text, Theme, XStack } from 'tamagui';

export function StatusBadge({
  status,
  waitlistPosition,
}: {
  status: RegistrationStatus;
  waitlistPosition?: number | null;
}) {
  const confirmed = status === 'CONFIRMED';
  return (
    <Theme name={confirmed ? 'green' : 'yellow'}>
      <XStack bg="$color4" px="$2.5" py="$1" rounded="$10" self="flex-start">
        <Text fontSize="$2" fontWeight="600" color="$color11">
          {confirmed ? "You're going" : `Waitlist #${waitlistPosition ?? '?'}`}
        </Text>
      </XStack>
    </Theme>
  );
}

export function Pill({ label, theme = 'gray' }: { label: string; theme?: 'gray' | 'red' | 'blue' }) {
  return (
    <Theme name={theme}>
      <XStack bg="$color4" px="$2.5" py="$1" rounded="$10" self="flex-start">
        <Text fontSize="$2" fontWeight="600" color="$color11">
          {label}
        </Text>
      </XStack>
    </Theme>
  );
}
