import {
  useApi,
  useAttendees,
  useCancelRegistration,
  useCurrentUser,
  useDeleteEvent,
  useEvent,
  useKickAttendee,
  useRegister,
  useSetMetric,
} from '@events/shared';
import { AttendeeList, ErrorText, EventDetails } from '@events/ui';
import { ArrowLeft, Lock, Pencil, Trash2 } from '@tamagui/lucide-icons-2';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Button, Card, H4, Paragraph, XStack, YStack } from 'tamagui';
import { PageState } from '../components/PageState';

export function EventPage() {
  const { id } = useParams() as { id: string };
  const navigate = useNavigate();
  const api = useApi();
  const { user, isAdmin } = useCurrentUser();
  const { data: event, isPending, error } = useEvent(id);
  const register = useRegister(id);
  const cancel = useCancelRegistration(id);
  const remove = useDeleteEvent();
  const kick = useKickAttendee(id);
  const setMetric = useSetMetric(id);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Attendee list is only visible to admins and people signed up (confirmed or waitlisted).
  const canSeeAttendees = isAdmin || !!event?.myStatus;
  const attendees = useAttendees(id, canSeeAttendees);

  if (isPending || error) return <PageState loading={isPending} error={error} />;

  const adminActions = isAdmin && (
    <XStack gap="$2" ml="auto">
      <Button size="$3" icon={<Pencil size={14} />} onPress={() => navigate(`/events/${id}/edit`)}>
        Edit
      </Button>
      {confirmDelete ? (
        <>
          <Button
            size="$3"
            theme="red"
            disabled={remove.isPending}
            onPress={() => remove.mutate(id, { onSuccess: () => void navigate('/', { replace: true }) })}
          >
            Delete for everyone?
          </Button>
          <Button size="$3" chromeless onPress={() => setConfirmDelete(false)}>
            Keep
          </Button>
        </>
      ) : (
        <Button size="$3" chromeless theme="red" icon={<Trash2 size={14} />} onPress={() => setConfirmDelete(true)}>
          Delete
        </Button>
      )}
    </XStack>
  );

  const mutationError = register.error ?? cancel.error ?? remove.error ?? kick.error ?? setMetric.error;

  return (
    <YStack gap="$5">
      <Button self="flex-start" size="$3" chromeless icon={<ArrowLeft size={16} />} onPress={() => navigate('/')}>
        All events
      </Button>

      <XStack gap="$6" flexWrap="wrap" items="flex-start">
        <YStack flex={1} flexBasis={480} minW={280}>
          <EventDetails
            event={event}
            imageUri={api.resolveUrl(event.imageUrl)}
            onRegister={() => register.mutate()}
            onCancel={() => cancel.mutate()}
            pending={register.isPending || cancel.isPending}
            actions={adminActions}
          />
          {mutationError && <ErrorText>{mutationError.message}</ErrorText>}
        </YStack>

        <Card flex={1} flexBasis={280} minW={260} maxW={420} p="$4" gap="$3" borderWidth={1} borderColor="$borderColor">
          {canSeeAttendees ? (
            attendees.data ? (
              <AttendeeList
                attendees={attendees.data}
                currentUserId={user?.id}
                onKick={isAdmin ? (userId) => kick.mutate(userId) : undefined}
                kickPending={kick.isPending}
                metrics={event.metrics}
                onToggleMetric={
                  isAdmin ? (userId, metric, marked) => setMetric.mutate({ userId, metric, marked }) : undefined
                }
              />
            ) : (
              <PageState loading={attendees.isPending} error={attendees.error} />
            )
          ) : (
            <YStack gap="$2" items="center" py="$4">
              <Lock size={20} color="$color10" />
              <H4>Who's going?</H4>
              <Paragraph color="$color10" text="center">
                Sign up to see the attendee list.
              </Paragraph>
            </YStack>
          )}
        </Card>
      </XStack>
    </YStack>
  );
}
