import type { Attendee, Attendees } from '@events/shared';
import { UserX } from '@tamagui/lucide-icons-2';
import { useState } from 'react';
import { Avatar, Button, H5, Paragraph, Separator, Text, XStack, YStack } from 'tamagui';

interface KickProps {
  /** When set (admins only), each other attendee gets a "Remove" action. */
  onKick?: (userId: string) => void;
  kickPending?: boolean;
}

export function AttendeeList({
  attendees,
  currentUserId,
  ...kick
}: { attendees: Attendees; currentUserId?: string } & KickProps) {
  return (
    <YStack gap="$4">
      <Section
        title={`Going (${attendees.confirmed.length})`}
        people={attendees.confirmed}
        currentUserId={currentUserId}
        empty="Nobody yet."
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
}: {
  title: string;
  people: Attendee[];
  currentUserId?: string;
  empty?: string;
  numbered?: boolean;
} & KickProps) {
  const [confirmKick, setConfirmKick] = useState<string | null>(null);
  return (
    <YStack gap="$2.5">
      <H5>{title}</H5>
      {people.length === 0 && empty && <Paragraph color="$color10">{empty}</Paragraph>}
      {people.map((person, i) => (
        <XStack key={person.userId} gap="$3" items="center">
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
