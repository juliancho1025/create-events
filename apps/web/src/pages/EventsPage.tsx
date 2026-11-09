import { useApi, useCurrentUser, useEvents, useT, type EventScope } from '@events/shared';
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
  const t = useT();

  return (
    <YStack gap="$5">
      <XStack justify="space-between" items="center" flexWrap="wrap" gap="$3">
        <H2>{t.events.title}</H2>
        <XStack gap="$2" items="center">
          {(['upcoming', 'past'] as const).map((s) => (
            <Button key={s} size="$3" theme={scope === s ? 'accent' : undefined} chromeless={scope !== s} onPress={() => setScope(s)}>
              {s === 'upcoming' ? t.events.upcoming : t.events.past}
            </Button>
          ))}
          {isAdmin && (
            <Button size="$3" theme="accent" icon={<Plus size={16} />} onPress={() => navigate('/events/new')}>
              {t.events.newEvent}
            </Button>
          )}
        </XStack>
      </XStack>

      {isPending || error || !events?.length ? (
        <PageState
          loading={isPending}
          error={error}
          empty={scope === 'upcoming' ? (isAdmin ? t.events.noUpcomingAdmin : t.events.noUpcoming) : t.events.noPast}
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
