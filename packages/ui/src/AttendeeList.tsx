import type { Attendee, Attendees, EventMetric } from '@events/shared';
import { Check, UserX } from '@tamagui/lucide-icons-2';
import { useState } from 'react';
import { Avatar, Button, H5, Paragraph, Separator, Text, XStack, YStack } from 'tamagui';

interface KickProps {
  /** When set (admins only), each other attendee gets a "Remove" action. */
  onKick?: (userId: string) => void;
  kickPending?: boolean;
}

interface MetricProps {
  /** With `onToggleMetric` (admins only), confirmed attendees get one toggle per metric. */
  metrics?: EventMetric[];
  onToggleMetric?: (userId: string, metric: string, marked: boolean) => void;
}

export function AttendeeList({
  attendees,
  currentUserId,
  metrics,
  onToggleMetric,
  ...kick
}: { attendees: Attendees; currentUserId?: string } & KickProps & MetricProps) {
  return (
    <YStack gap="$4">
      <Section
        title={`Going (${attendees.confirmed.length})`}
        people={attendees.confirmed}
        currentUserId={currentUserId}
        empty="Nobody yet."
        metrics={metrics}
        onToggleMetric={onToggleMetric}
        {...kick}
      />
      {attendees.waitlist.length > 0 && (
        <>
          <Separator />
          <Section
            title={`Waitlist (${attendees.waitlist.length})`}
            people={attendees.waitlist}
            currentUserId={currentUserId}
            numbered
            {...kick}
          />
        </>
      )}
    </YStack>
  );
}

function Section({
  title,
  people,
  currentUserId,
  empty,
  numbered,
  onKick,
  kickPending,
  metrics,
  onToggleMetric,
}: {
  title: string;
  people: Attendee[];
  currentUserId?: string;
  empty?: string;
  numbered?: boolean;
} & KickProps &
  MetricProps) {
  const [confirmKick, setConfirmKick] = useState<string | null>(null);
  return (
    <YStack gap="$2.5">
      <H5>{title}</H5>
      {people.length === 0 && empty && <Paragraph color="$color10">{empty}</Paragraph>}
      {people.map((person, i) => (
        <YStack key={person.userId} gap="$1.5">
          <XStack gap="$3" items="center">
            {numbered && (
              <Text width={20} color="$color10" fontSize="$2">
                {i + 1}.
              </Text>
            )}
            <Avatar circular size="$3">
              {person.avatarUrl && <Avatar.Image src={person.avatarUrl} />}
              <Avatar.Fallback bg="$color5" items="center" justify="center">
                <Text fontSize="$2" fontWeight="600">
                  {initials(person.name)}
                </Text>
              </Avatar.Fallback>
            </Avatar>
            <YStack flex={1}>
              <Text fontWeight={person.userId === currentUserId ? '700' : '400'}>
                {person.name}
                {person.userId === currentUserId ? ' (you)' : ''}
              </Text>
              {person.email && (
                <Text fontSize="$2" color="$color10">
                  {person.email}
                </Text>
              )}
            </YStack>
            {onKick && person.userId !== currentUserId &&
              (confirmKick === person.userId ? (
                <XStack gap="$1">
                  <Button size="$2" theme="red" disabled={kickPending} onPress={() => onKick(person.userId)}>
                    Kick out?
                  </Button>
                  <Button size="$2" chromeless onPress={() => setConfirmKick(null)}>
                    Keep
                  </Button>
                </XStack>
              ) : (
                <Button
                  size="$2"
                  chromeless
                  theme="red"
                  icon={<UserX size={14} />}
                  aria-label={`Remove ${person.name}`}
                  onPress={() => setConfirmKick(person.userId)}
                >
                  Remove
                </Button>
              ))}
          </XStack>
          {onToggleMetric && !!metrics?.length && (
            <XStack gap="$1.5" flexWrap="wrap" pl={numbered ? 56 : 36}>
              {metrics.map(({ key, label }) => {
                const marked = !!person.metrics?.includes(key);
                return (
                  <Button
                    key={key}
                    size="$2"
                    rounded="$10"
                    theme={marked ? 'red' : undefined}
                    chromeless={!marked}
                    borderWidth={1}
                    borderColor={marked ? '$color8' : '$borderColor'}
                    icon={marked ? <Check size={12} /> : undefined}
                    aria-pressed={marked}
                    aria-label={`${label} for ${person.name}: ${marked ? 'yes' : 'no'}`}
                    onPress={() => onToggleMetric(person.userId, key, !marked)}
                  >
                    {label}
                  </Button>
                );
              })}
            </XStack>
          )}
        </YStack>
      ))}
    </YStack>
  );
}

export const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');
