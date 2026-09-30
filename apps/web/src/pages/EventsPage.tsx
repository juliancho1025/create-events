import { useApi, useCurrentUser, useEvents, type EventScope } from '@events/shared';
import { EventCard } from '@events/ui';
import { Plus } from '@tamagui/lucide-icons-2';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Button, H2, XStack, YStack } from 'tamagui';
import { PageState } from '../components/PageState';

export function EventsPage() {
  const [scope, setScope] = useState<EventScope>('upcoming');
  const { data: events, isPending, error } = useEvents(scope);
  const { isAdmin } = useCurrentUser();
  const api = useApi();
  const navigate = useNavigate();

  return (
    <YStack gap="$5">
      <XStack justify="space-between" items="center" flexWrap="wrap" gap="$3">
        <H2>Events</H2>
        <XStack gap="$2" items="center">
          {(['upcoming', 'past'] as const).map((s) => (
            <Button key={s} size="$3" theme={scope === s ? 'accent' : undefined} chromeless={scope !== s} onPress={() => setScope(s)}>
              {s === 'upcoming' ? 'Upcoming' : 'Past'}
            </Button>
          ))}
          {isAdmin && (
            <Button size="$3" theme="accent" icon={<Plus size={16} />} onPress={() => navigate('/events/new')}>
              New event
            </Button>
          )}
        </XStack>
      </XStack>

      {isPending || error || !events?.length ? (
        <PageState
          loading={isPending}
          error={error}
          empty={scope === 'upcoming' ? `No upcoming events${isAdmin ? '. Create the first one!' : ' yet.'}` : 'No past events.'}
        />
      ) : (
        <XStack flexWrap="wrap" mx="$-2">
          {events.map((event) => (
            <YStack key={event.id} width="100%" $sm={{ width: '50%' }} $lg={{ width: '33.333%' }} p="$2">
              <EventCard event={event} imageUri={api.resolveUrl(event.imageUrl)} onPress={() => navigate(`/events/${event.id}`)} />
            </YStack>
          ))}
        </XStack>
      )}
    </YStack>
  );
}
