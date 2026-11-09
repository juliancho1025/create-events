import { useApi, useApiContext, useAuthProviders, useDevLogin, useT } from '@events/shared';
import { ErrorText, LanguageSelector } from '@events/ui';
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
  const t = useT();
  const [email, setEmail] = useState('admin@example.com');
  const [name, setName] = useState('Ada Admin');

  if (ready && token) return <Navigate to={(location.state as { from?: string } | null)?.from ?? '/'} replace />;

  return (
    <YStack minH="100vh" items="center" justify="center" p="$4">
      <Card width="100%" maxW={400} p="$6" gap="$5" borderWidth={1} borderColor="$borderColor">
        <XStack justify="flex-end" mt="$-3" mr="$-3">
          <LanguageSelector />
        </XStack>
        <YStack items="center" gap="$2">
          <CalendarDays size={36} color="$accent10" />
          <H3>{t.login.title}</H3>
          <Paragraph color="$color10" text="center">
            {t.login.subtitle}
          </Paragraph>
        </YStack>

        {providers.isPending && <Spinner />}
        {providers.error && <ErrorText>{t.login.apiDown}</ErrorText>}

        {providers.data?.google && (
          <Button theme="accent" size="$4" onPress={() => window.location.assign(api.googleLoginUrl())}>
            {t.login.google}
          </Button>
        )}
        {providers.data && !providers.data.google && (
          <Paragraph fontSize="$2" color="$color10" text="center">
            {t.login.googleMissing}
          </Paragraph>
        )}

        {providers.data?.dev && (
          <>
            <XStack items="center" gap="$3">
              <Separator />
              <Text fontSize="$2" color="$color10">
                {t.login.devLogin}
              </Text>
              <Separator />
            </XStack>
            <Form gap="$3" onSubmit={() => devLogin.mutate({ email, name })}>
              <YStack gap="$1.5">
                <Label htmlFor="email" lineHeight="$1">{t.login.email}</Label>
                <Input id="email" value={email} onChangeText={setEmail} autoCapitalize="none" inputMode="email" />
              </YStack>
              <YStack gap="$1.5">
                <Label htmlFor="name" lineHeight="$1">{t.login.name}</Label>
                <Input id="name" value={name} onChangeText={setName} />
              </YStack>
              <Paragraph fontSize="$2" color="$color10">
                {t.login.adminHint}
              </Paragraph>
              {devLogin.error && <ErrorText>{devLogin.error.message}</ErrorText>}
              <Form.Trigger asChild disabled={devLogin.isPending}>
                <Button icon={devLogin.isPending ? <Spinner /> : undefined}>{t.login.signIn}</Button>
              </Form.Trigger>
            </Form>
          </>
        )}
      </Card>
    </YStack>
  );
}
