import { parsePeople, useT, type AddPeopleInput, type AddPersonResult, type AddPersonStatus, type Invitation } from '@events/shared';
import { Mail, UserPlus, X } from '@tamagui/lucide-icons-2';
import { useState } from 'react';
import { Button, Form, H5, Paragraph, Separator, Spinner, Text, TextArea, Theme, XStack, YStack } from 'tamagui';
import { ErrorText } from './EventForm';

const RESULT_THEMES: Record<AddPersonStatus, 'green' | 'yellow' | 'red' | undefined> = {
  CONFIRMED: 'green',
  WAITLISTED: 'yellow',
  ALREADY_REGISTERED: undefined,
  INVITED: 'green',
  PENDING_PROFILE: 'yellow',
  NOT_FOUND: 'red',
};

/**
 * For the event creator: add people by email or @username, see the outcome per
 * person, and manage invitations still waiting for someone to sign up.
 */
export function AddPeople({
  onAdd,
  pending,
  error,
  invitations,
  onRevoke,
  revokePending,
}: {
  /** Resolves with one result per email/username; the text box clears on success. */
  onAdd: (input: AddPeopleInput) => Promise<AddPersonResult[]>;
  pending?: boolean;
  error?: string;
  invitations?: Invitation[];
  onRevoke: (email: string) => void;
  revokePending?: boolean;
}) {
  const t = useT();
  const [text, setText] = useState('');
  const [results, setResults] = useState<AddPersonResult[]>([]);
  const parsed = parsePeople(text);
  const count = parsed.emails.length + parsed.usernames.length;

  const submit = () => {
    if (!count || pending) return;
    void onAdd(parsed).then((res) => {
      setResults(res);
      setText('');
    }, () => undefined); // the error is shown through `error`
  };

  return (
    <YStack gap="$3">
      <H5>{t.addPeople.title}</H5>
      <Form gap="$2" onSubmit={submit}>
        <TextArea
          aria-label={t.addPeople.inputLabel}
          placeholder={t.addPeople.placeholder}
          value={text}
          onChangeText={setText}
          minH={80}
          autoCapitalize="none"
        />
        <Paragraph fontSize="$2" color="$color10">
          {t.addPeople.hint}
        </Paragraph>
        <Form.Trigger asChild disabled={!count || pending}>
          <Button self="flex-start" size="$3" theme="accent" icon={pending ? <Spinner /> : <UserPlus size={14} />}>
            {t.addPeople.add(count)}
          </Button>
        </Form.Trigger>
      </Form>
      {error && <ErrorText>{error}</ErrorText>}

      {results.length > 0 && (
        <YStack gap="$1.5" aria-live="polite">
          {results.map((r) => {
            const theme = RESULT_THEMES[r.status];
            const emailFailed = r.emailSent === false;
            return (
              <XStack key={r.input} gap="$2" items="baseline" flexWrap="wrap">
                <Text fontSize="$2" fontWeight="600">
                  {r.name ? `${r.name} (${r.input})` : r.input}
                </Text>
                <Theme name={emailFailed ? 'red' : theme}>
                  <Text fontSize="$2" color={theme || emailFailed ? '$color10' : '$color11'}>
                    {emailFailed ? t.addPeople.emailFailed : t.addPeople.status[r.status]}
                  </Text>
                </Theme>
              </XStack>
            );
          })}
        </YStack>
      )}

      {!!invitations?.length && (
        <>
          <Separator />
          <H5>{t.addPeople.invited(invitations.length)}</H5>
          {invitations.map((inv) => (
            <XStack key={inv.email} gap="$2" items="center">
              <Mail size={14} color="$color10" />
              <Text flex={1} fontSize="$3">
                {inv.email}
              </Text>
              <Button
                size="$2"
                chromeless
                icon={<X size={14} />}
                disabled={revokePending}
                aria-label={t.addPeople.revokeLabel(inv.email)}
                onPress={() => onRevoke(inv.email)}
              />
            </XStack>
          ))}
        </>
      )}
    </YStack>
  );
}
