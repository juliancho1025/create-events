import { parsePeople, type AddPeopleInput, type AddPersonResult, type AddPersonStatus, type Invitation } from '@events/shared';
import { Mail, UserPlus, X } from '@tamagui/lucide-icons-2';
import { useState } from 'react';
import { Button, Form, H5, Paragraph, Separator, Spinner, Text, TextArea, Theme, XStack, YStack } from 'tamagui';
import { ErrorText } from './EventForm';

const RESULT_LABELS: Record<AddPersonStatus, { text: string; theme?: 'green' | 'yellow' | 'red' }> = {
  CONFIRMED: { text: 'Signed up', theme: 'green' },
  WAITLISTED: { text: 'Added to the waitlist (event is full)', theme: 'yellow' },
  ALREADY_REGISTERED: { text: 'Already signed up' },
  INVITED: { text: 'No account yet: sign-up link emailed', theme: 'green' },
  PENDING_PROFILE: { text: 'Joins once they finish their profile (emailed)', theme: 'yellow' },
  NOT_FOUND: { text: 'No user with that username', theme: 'red' },
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
      <H5>Add people</H5>
      <Form gap="$2" onSubmit={submit}>
        <TextArea
          aria-label="Emails or usernames"
          placeholder="ada@example.com, @bob…"
          value={text}
          onChangeText={setText}
          minH={80}
          autoCapitalize="none"
        />
        <Paragraph fontSize="$2" color="$color10">
          Emails or @usernames, separated by commas or spaces. People without an account get an email with a link to
          sign up, and are added once they do.
        </Paragraph>
        <Form.Trigger asChild disabled={!count || pending}>
          <Button self="flex-start" size="$3" theme="accent" icon={pending ? <Spinner /> : <UserPlus size={14} />}>
            {count > 1 ? `Add ${count} people` : 'Add'}
          </Button>
        </Form.Trigger>
      </Form>
      {error && <ErrorText>{error}</ErrorText>}

      {results.length > 0 && (
        <YStack gap="$1.5" aria-live="polite">
          {results.map((r) => {
            const label = RESULT_LABELS[r.status];
            const emailFailed = r.emailSent === false;
            return (
              <XStack key={r.input} gap="$2" items="baseline" flexWrap="wrap">
                <Text fontSize="$2" fontWeight="600">
                  {r.name ? `${r.name} (${r.input})` : r.input}
                </Text>
                <Theme name={emailFailed ? 'red' : label.theme}>
                  <Text fontSize="$2" color={label.theme || emailFailed ? '$color10' : '$color11'}>
                    {emailFailed ? 'Invitation saved, but the email could not be sent' : label.text}
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
          <H5>Invited ({invitations.length})</H5>
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
                aria-label={`Cancel invitation for ${inv.email}`}
                onPress={() => onRevoke(inv.email)}
              />
            </XStack>
          ))}
        </>
      )}
    </YStack>
  );
}
