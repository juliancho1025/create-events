import { useCurrentUser, useUpdateProfile } from '@events/shared';
import { ProfileForm } from '@events/ui';
import { useLocation, useNavigate } from 'react-router';
import { AvatarPicker } from '../components/AvatarPicker';
import { Card, H2, Paragraph, YStack } from 'tamagui';

/** Edit page, and the onboarding step new users are sent to before anything else. */
export function ProfilePage() {
  const { user } = useCurrentUser();
  const update = useUpdateProfile();
  const navigate = useNavigate();
  const from = (useLocation().state as { from?: string } | null)?.from ?? '/';
  if (!user) return null; // RequireAuth renders this page only once the user has loaded
  const onboarding = !user.profileComplete;

  return (
    <YStack gap="$4" maxW={720} width="100%" mx="auto">
      <YStack gap="$1">
        <H2>{onboarding ? 'Welcome! Set up your profile' : 'Your profile'}</H2>
        {onboarding && (
          <Paragraph color="$color10">You need a username and an emergency contact before signing up for events.</Paragraph>
        )}
      </YStack>
      <Card p="$5" borderWidth={1} borderColor="$borderColor">
        <AvatarPicker user={user} />
      </Card>
      <Card p="$5" borderWidth={1} borderColor="$borderColor">
        <ProfileForm
          user={user}
          submitting={update.isPending}
          error={update.error?.message}
          onCancel={onboarding ? undefined : () => navigate(-1)}
          onSubmit={(values) => update.mutate(values, { onSuccess: () => void navigate(from, { replace: true }) })}
        />
      </Card>
    </YStack>
  );
}
