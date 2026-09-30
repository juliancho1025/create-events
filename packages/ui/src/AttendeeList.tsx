import type { Attendee, Attendees } from '@events/shared';
import { Avatar, H5, Paragraph, Separator, Text, XStack, YStack } from 'tamagui';

export function AttendeeList({ attendees, currentUserId }: { attendees: Attendees; currentUserId?: string }) {
  return (
    <YStack gap="$4">
      <Section title={`Going (${attendees.confirmed.length})`} people={attendees.confirmed} currentUserId={currentUserId} empty="Nobody yet." />
      {attendees.waitlist.length > 0 && (
        <>
          <Separator />
          <Section
            title={`Waitlist (${attendees.waitlist.length})`}
            people={attendees.waitlist}
            currentUserId={currentUserId}
            numbered
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
}: {
  title: string;
  people: Attendee[];
  currentUserId?: string;
  empty?: string;
  numbered?: boolean;
}) {
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
    .map((w) => w[0]!.toUpperCase())
    .join('');
