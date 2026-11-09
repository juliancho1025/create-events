import { useApi, useEvent, useEventNotifications, useT, useUpdateEvent } from '@events/shared';
import { EventForm } from '@events/ui';
import { useNavigate, useParams } from 'react-router';
import { Card, H2, YStack } from 'tamagui';
import { PageState } from '../components/PageState';
import { WebDateTimeInput, WebImageInput } from '../components/WebInputs';

export function EditEventPage() {
  const { id } = useParams() as { id: string };
  const navigate = useNavigate();
  const api = useApi();
  const { data: event, isPending, error } = useEvent(id);
  const update = useUpdateEvent(id);
  const t = useT();
  // The form copies its initial values once, so wait for both.
  const notifications = useEventNotifications(id, true);

  if (isPending || error) return <PageState loading={isPending} error={error} />;
  if (!notifications.data) return <PageState loading={notifications.isPending} error={notifications.error} />;
  const pick = (status: 'PENDING' | 'SENT') =>
    notifications.data
      .filter((n) => n.status === status)
      .map(({ minutesBefore, message }) => ({ minutesBefore, message }));

  return (
    <YStack gap="$4" maxW={720} width="100%" mx="auto">
      <H2>{t.event.editTitle}</H2>
      <Card p="$5" borderWidth={1} borderColor="$borderColor">
        <EventForm
          mode="edit"
          initial={{
            name: event.name,
            address: event.address,
            description: event.description,
            startsAt: new Date(event.startsAt),
            capacity: event.capacity,
            imageUri: api.resolveUrl(event.imageUrl),
            metrics: event.metrics.map((m) => m.label),
            notifications: pick('PENDING'),
            sentNotifications: pick('SENT'),
          }}
          DateTimeInput={WebDateTimeInput}
          ImageInput={WebImageInput}
          submitting={update.isPending}
          error={update.error?.message}
          onCancel={() => navigate(-1)}
          onSubmit={(values) => update.mutate(values, { onSuccess: () => void navigate(`/events/${id}`) })}
        />
      </Card>
    </YStack>
  );
}
