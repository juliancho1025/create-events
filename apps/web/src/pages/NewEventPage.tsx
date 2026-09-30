import { useCreateEvent } from '@events/shared';
import { EventForm } from '@events/ui';
import { useNavigate } from 'react-router';
import { Card, H2, YStack } from 'tamagui';
import { WebDateTimeInput, WebImageInput } from '../components/WebInputs';

export function NewEventPage() {
  const navigate = useNavigate();
  const create = useCreateEvent();

  return (
    <YStack gap="$4" maxW={720} width="100%" mx="auto">
      <H2>New event</H2>
      <Card p="$5" borderWidth={1} borderColor="$borderColor">
        <EventForm
          mode="create"
          DateTimeInput={WebDateTimeInput}
          ImageInput={WebImageInput}
          submitting={create.isPending}
          error={create.error?.message}
          onCancel={() => navigate(-1)}
          onSubmit={(values) => create.mutate(values, { onSuccess: (event) => navigate(`/events/${event.id}`) })}
        />
      </Card>
    </YStack>
  );
}
