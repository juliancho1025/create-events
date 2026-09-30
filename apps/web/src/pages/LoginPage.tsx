import { useApi, useApiContext, useAuthProviders, useDevLogin } from '@events/shared';
import { ErrorText } from '@events/ui';
import { CalendarDays } from '@tamagui/lucide-icons-2';
import { useState } from 'react';
import { Navigate, useLocation } from 'react-router';
import { Button, Card, Form, H3, Input, Label, Paragraph, Separator, Spinner, Text, XStack, YStack } from 'tamagui';

export function LoginPage() {
  const { token, ready } = useApiContext();
  const api = useApi();
  const providers = useAuthProviders();
  const devLogin = useDevLogin();
  const location = useLocation();
  const [email, setEmail] = useState('admin@example.com');
  const [name, setName] = useState('Ada Admin');

  if (ready && token) return <Navigate to={(location.state as { from?: string } | null)?.from ?? '/'} replace />;

  return (
    <YStack minH="100vh" items="center" justify="center" p="$4">
      <Card width="100%" maxW={400} p="$6" gap="$5" borderWidth={1} borderColor="$borderColor">
        <YStack items="center" gap="$2">
          <CalendarDays size={36} color="$accent10" />
          <H3>Sign in to Events</H3>
          <Paragraph color="$color10" text="center">
            Browse and sign up for upcoming events.
          </Paragraph>
        </YStack>

        {providers.isPending && <Spinner />}
        {providers.error && <ErrorText>Can't reach the API. Is it running?</ErrorText>}

        {providers.data?.google && (
          <Button theme="accent" size="$4" onPress={() => window.location.assign(api.googleLoginUrl())}>
            Continue with Google
          </Button>
        )}
        {providers.data && !providers.data.google && (
          <Paragraph fontSize="$2" color="$color10" text="center">
            Google login is not configured (set GOOGLE_CLIENT_ID in apps/api/.env).
          </Paragraph>
        )}

        {providers.data?.dev && (
          <>
            <XStack items="center" gap="$3">
              <Separator />
              <Text fontSize="$2" color="$color10">
                DEV LOGIN
              </Text>
              <Separator />
            </XStack>
            <Form gap="$3" onSubmit={() => devLogin.mutate({ email, name })}>
              <YStack gap="$1.5">
                <Label htmlFor="email" lineHeight="$1">Email</Label>
                <Input id="email" value={email} onChangeText={setEmail} autoCapitalize="none" inputMode="email" />
              </YStack>
              <YStack gap="$1.5">
                <Label htmlFor="name" lineHeight="$1">Name</Label>
                <Input id="name" value={name} onChangeText={setName} />
              </YStack>
              <Paragraph fontSize="$2" color="$color10">
                Emails listed in ADMIN_EMAILS get the admin role.
              </Paragraph>
              {devLogin.error && <ErrorText>{devLogin.error.message}</ErrorText>}
              <Form.Trigger asChild disabled={devLogin.isPending}>
                <Button icon={devLogin.isPending ? <Spinner /> : undefined}>Sign in</Button>
              </Form.Trigger>
            </Form>
          </>
        )}
      </Card>
    </YStack>
  );
}
