import { useApiContext, useCurrentUser, useT } from '@events/shared';
import { initials, LanguageSelector } from '@events/ui';
import { BarChart3, Bell, BellOff, CalendarDays, LogOut } from '@tamagui/lucide-icons-2';
import { Link, Navigate, Outlet, useLocation, useNavigate } from 'react-router';
import { Avatar, Button, Text, XStack, YStack } from 'tamagui';
import { unsubscribe, usePushNotifications } from '../push';
import { PageState } from './PageState';

/**
 * Route guard: sends anonymous users to /login and new users to /profile to
 * finish onboarding, remembering where they were going.
 */
export function RequireAuth() {
  const { token, ready } = useApiContext();
  const { user, isLoading, error } = useCurrentUser();
  const location = useLocation();

  if (ready && !token) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (isLoading || error) return <PageState loading={isLoading} error={error} />;
  if (user && !user.profileComplete && location.pathname !== '/profile') {
    return <Navigate to="/profile" replace state={{ from: location.pathname }} />;
  }
  return <Outlet />;
}

export function RequireAdmin() {
  const { isAdmin } = useCurrentUser();
  const t = useT();
  return isAdmin ? <Outlet /> : <PageState error={new Error(t.common.adminsOnly)} />;
}

export function Layout() {
  const { user, isAdmin } = useCurrentUser();
  const { api, signOut } = useApiContext();
  const navigate = useNavigate();
  const t = useT();

  return (
    <YStack minH="100vh">
      <XStack
        px="$4"
        py="$3"
        items="center"
        justify="space-between"
        borderBottomWidth={1}
        borderColor="$borderColor"
        bg="$background"
        position="sticky"
        t={0}
        z={10}
      >
        <Link to="/" style={{ textDecoration: 'none' }}>
          <XStack gap="$2" items="center">
            <CalendarDays size={22} color="$accent10" />
            <Text fontSize="$6" fontWeight="700">
              {t.layout.appName}
            </Text>
          </XStack>
        </Link>
        {user && (
          <XStack gap="$3" items="center">
            <LanguageSelector />
            <PushToggle />
            {isAdmin && (
              <Button size="$3" chromeless icon={<BarChart3 size={16} />} onPress={() => navigate('/metrics')}>
                {t.layout.metrics}
              </Button>
            )}
            <Link to="/profile" aria-label={t.layout.profile} style={{ textDecoration: 'none' }}>
              <XStack gap="$3" items="center">
                <Avatar circular size="$3">
                  {user.avatarUrl && <Avatar.Image src={api.resolveUrl(user.avatarUrl)} />}
                  <Avatar.Fallback bg="$color5" items="center" justify="center">
                    <Text fontSize="$2" fontWeight="600">
                      {initials(user.name)}
                    </Text>
                  </Avatar.Fallback>
                </Avatar>
                <YStack display="none" $sm={{ display: 'flex' }}>
                  <Text fontSize="$3" fontWeight="600">
                    {user.name}
                  </Text>
                  <Text fontSize="$1" color="$color10">
                    {user.username ? `@${user.username}` : isAdmin ? t.layout.admin : t.layout.member}
                    {user.username && isAdmin ? ` · ${t.layout.admin}` : ''}
                  </Text>
                </YStack>
              </XStack>
            </Link>
            <Button
              size="$3"
              chromeless
              icon={<LogOut size={16} />}
              onPress={() => void unsubscribe(api).finally(signOut)}
              aria-label={t.layout.logOut}
            />
          </XStack>
        )}
      </XStack>
      <YStack flex={1} width="100%" maxW={1100} mx="auto" px="$4" py="$5">
        <Outlet />
      </YStack>
    </YStack>
  );
}

/** Bell in the header: turns this browser's push notifications on or off. Hidden where push can't work. */
function PushToggle() {
  const { state, pending, error, enable, disable } = usePushNotifications();
  const t = useT();
  const hints: Record<string, string> = { denied: t.layout.pushDenied, unavailable: t.layout.pushUnavailable };
  if (state === null || state === 'unsupported') return null;
  const on = state === 'on';
  const blocked = state === 'denied' || state === 'unavailable';
  const label = error?.message ?? hints[state] ?? (on ? t.layout.pushOff : t.layout.pushOn);
  return (
    <Button
      size="$3"
      chromeless
      icon={on ? <Bell size={16} color="$accent10" /> : <BellOff size={16} />}
      disabled={pending || blocked}
      opacity={blocked ? 0.5 : 1}
      aria-label={label}
      aria-pressed={on}
      onPress={() => void (on ? disable() : enable())}
    />
  );
}
