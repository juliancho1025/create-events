import { useApi, useEvent, useUpdateEvent } from '@events/shared';
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

  if (isPending || error) return <PageState loading={isPending} error={error} />;

  return (
    <YStack gap="$4" maxW={720} width="100%" mx="auto">
      <H2>Edit event</H2>
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
