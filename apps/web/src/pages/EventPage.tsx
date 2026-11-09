import {
  isPast,
  useAddPeople,
  useApi,
  useAttendees,
  useCancelRegistration,
  useCurrentUser,
  useDeleteEvent,
  useDeleteReview,
  useEvent,
  useInvitations,
  useKickAttendee,
  useRegister,
  useRevokeInvitation,
  useReviews,
  useSaveReview,
  useSetMetric,
  useT,
} from '@events/shared';
import { AddPeople, AttendeeList, ErrorText, EventDetails, EventReviews } from '@events/ui';
import { ArrowLeft, Lock, Pencil, Trash2 } from '@tamagui/lucide-icons-2';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Button, Card, H4, Paragraph, Separator, XStack, YStack } from 'tamagui';
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
  const reviews = useReviews(id);
  const saveReview = useSaveReview(id);
  const deleteReview = useDeleteReview(id);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const t = useT();

  // Attendee list is only visible to admins and people signed up (confirmed or waitlisted).
  const canSeeAttendees = isAdmin || !!event?.myStatus;
  const attendees = useAttendees(id, canSeeAttendees);
  // Only the creator adds people, and only until the event starts (the API enforces both).
  const canAddPeople = !!event?.isCreator && !isPast(event);
  const invitations = useInvitations(id, canAddPeople);
  const addPeople = useAddPeople(id);
  const revokeInvitation = useRevokeInvitation(id);

  if (isPending || error) return <PageState loading={isPending} error={error} />;

  const adminActions = isAdmin && (
    <XStack gap="$2" ml="auto">
      <Button size="$3" icon={<Pencil size={14} />} onPress={() => navigate(`/events/${id}/edit`)}>
        {t.common.edit}
      </Button>
      {confirmDelete ? (
        <>
          <Button
            size="$3"
            theme="red"
            disabled={remove.isPending}
            onPress={() => remove.mutate(id, { onSuccess: () => void navigate('/', { replace: true }) })}
          >
            {t.event.deleteForEveryone}
          </Button>
          <Button size="$3" chromeless onPress={() => setConfirmDelete(false)}>
            {t.common.keep}
          </Button>
        </>
      ) : (
        <Button size="$3" chromeless theme="red" icon={<Trash2 size={14} />} onPress={() => setConfirmDelete(true)}>
          {t.common.delete}
        </Button>
      )}
    </XStack>
  );

  const mutationError = register.error ?? cancel.error ?? remove.error ?? kick.error ?? setMetric.error;
  // Mirrors the API rule: confirmed attendees, once the event has started.
  const canReview = event.myStatus === 'CONFIRMED' && isPast(event);

  return (
    <YStack gap="$5">
      <Button self="flex-start" size="$3" chromeless icon={<ArrowLeft size={16} />} onPress={() => navigate('/')}>
        {t.event.allEvents}
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

          <Separator my="$5" />
          {reviews.data ? (
            <EventReviews
              reviews={reviews.data}
              currentUserId={user?.id}
              onSave={canReview ? (input) => saveReview.mutate(input) : undefined}
              savePending={saveReview.isPending}
              onDelete={(userId) => deleteReview.mutate(userId === user?.id ? undefined : userId)}
              deletePending={deleteReview.isPending}
              canModerate={isAdmin}
            />
          ) : (
            <PageState loading={reviews.isPending} error={reviews.error} />
          )}
          {(saveReview.error ?? deleteReview.error) && (
            <ErrorText>{(saveReview.error ?? deleteReview.error)!.message}</ErrorText>
          )}
        </YStack>

        <YStack flex={1} flexBasis={280} minW={260} maxW={420} gap="$4">
          {canAddPeople && (
            <Card p="$4" borderWidth={1} borderColor="$borderColor">
              <AddPeople
                onAdd={(input) => addPeople.mutateAsync(input)}
                pending={addPeople.isPending}
                error={(addPeople.error ?? revokeInvitation.error ?? invitations.error)?.message}
                invitations={invitations.data}
                onRevoke={(email) => revokeInvitation.mutate(email)}
                revokePending={revokeInvitation.isPending}
              />
            </Card>
          )}
          <Card p="$4" gap="$3" borderWidth={1} borderColor="$borderColor">
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
                <H4>{t.event.whoIsGoing}</H4>
                <Paragraph color="$color10" text="center">
                  {t.event.signUpToSee}
                </Paragraph>
              </YStack>
            )}
          </Card>
        </YStack>
      </XStack>
    </YStack>
  );
}
