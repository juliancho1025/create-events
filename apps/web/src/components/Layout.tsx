import { useApiContext, useCurrentUser } from '@events/shared';
import { initials } from '@events/ui';
import { CalendarDays, LogOut } from '@tamagui/lucide-icons-2';
import { Link, Navigate, Outlet, useLocation } from 'react-router';
import { Avatar, Button, Text, XStack, YStack } from 'tamagui';
import { PageState } from './PageState';

/** Route guard: sends anonymous users to /login, remembering where they were going. */
export function RequireAuth() {
  const { token, ready } = useApiContext();
  const { isLoading, error } = useCurrentUser();
  const location = useLocation();

  if (ready && !token) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (isLoading || error) return <PageState loading={isLoading} error={error} />;
  return <Outlet />;
}

export function RequireAdmin() {
  const { isAdmin } = useCurrentUser();
  return isAdmin ? <Outlet /> : <PageState error={new Error('Admins only')} />;
}

export function Layout() {
  const { user, isAdmin } = useCurrentUser();
  const { signOut } = useApiContext();

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
        position={'sticky' as 'relative'}
        t={0}
        z={10}
      >
        <Link to="/" style={{ textDecoration: 'none' }}>
          <XStack gap="$2" items="center">
            <CalendarDays size={22} color="$accent10" />
            <Text fontSize="$6" fontWeight="700">
              Events
            </Text>
          </XStack>
        </Link>
        {user && (
          <XStack gap="$3" items="center">
            <Avatar circular size="$3">
              {user.avatarUrl && <Avatar.Image src={user.avatarUrl} />}
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
                {isAdmin ? 'Admin' : 'Member'}
              </Text>
            </YStack>
            <Button size="$3" chromeless icon={<LogOut size={16} />} onPress={() => void signOut()} aria-label="Log out" />
          </XStack>
        )}
      </XStack>
      <YStack flex={1} width="100%" maxW={1100} mx="auto" px="$4" py="$5">
        <Outlet />
      </YStack>
    </YStack>
  );
}
