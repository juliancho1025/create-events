import type { ProfileInput, User } from '@events/shared';
import { useState } from 'react';
import { Button, Form, H5, Input, Paragraph, Spinner, TextArea, XStack, YStack } from 'tamagui';
import { ErrorText, Field } from './EventForm';

// Mirrors the API's rules (apps/api/src/users/user.dto.ts) for instant feedback.
const USERNAME = /^[a-z0-9_.]{3,30}$/;
const PHONE = /^\+?[0-9][0-9 ().-]{5,23}$/;

type Errors = Partial<Record<'name' | 'username' | 'phone' | 'contactName' | 'contactPhone', string>>;

export interface ProfileFormProps {
  user: User;
  onSubmit: (values: ProfileInput) => void;
  onCancel?: () => void;
  submitting?: boolean;
  /** Server-side error message, e.g. "That username is taken". */
  error?: string | null;
}

export function ProfileForm({ user, onSubmit, onCancel, submitting, error }: ProfileFormProps) {
  const [name, setName] = useState(user.name);
  const [username, setUsername] = useState(user.username ?? '');
  const [phone, setPhone] = useState(user.phone ?? '');
  const [contactName, setContactName] = useState(user.emergencyContact?.name ?? '');
  const [contactPhone, setContactPhone] = useState(user.emergencyContact?.phone ?? '');
  const [allergies, setAllergies] = useState(user.allergies ?? '');
  const [submitted, setSubmitted] = useState(false);

  const validate = (): Errors => {
    const e: Errors = {};
    if (!name.trim()) e.name = 'Name is required';
    const handle = username.trim().toLowerCase();
    if (!handle) e.username = 'Username is required';
    else if (!USERNAME.test(handle)) e.username = '3-30 letters, numbers, "_" or "."';
    if (phone.trim() && !PHONE.test(phone.trim())) e.phone = 'Enter a phone number, e.g. +1 555 010 2030';
    if (!contactName.trim()) e.contactName = 'Name is required';
    if (!contactPhone.trim()) e.contactPhone = 'Phone is required';
    else if (!PHONE.test(contactPhone.trim())) e.contactPhone = 'Enter a phone number, e.g. +1 555 010 2030';
    return e;
  };
  const errors: Errors = submitted ? validate() : {};

  const submit = () => {
    setSubmitted(true);
    if (Object.keys(validate()).length) return;
    onSubmit({
      name: name.trim(),
      username: username.trim().toLowerCase(),
      phone: phone.trim() || undefined,
      emergencyContact: { name: contactName.trim(), phone: contactPhone.trim() },
      allergies: allergies.trim() || undefined,
    });
  };

  return (
    <Form onSubmit={submit} gap="$4">
      <XStack gap="$4" flexWrap="wrap">
        <YStack flex={1} minW={220}>
          <Field id="name" label="Name" error={errors.name}>
            <Input id="name" value={name} onChangeText={setName} maxLength={100} autoComplete="name" />
          </Field>
        </YStack>
        <YStack flex={1} minW={220}>
          <Field id="username" label="Username" error={errors.username}>
            <Input
              id="username"
              value={username}
              onChangeText={setUsername}
              placeholder="ada.lovelace"
              placeholderTextColor="$color8"
              maxLength={30}
              autoCapitalize="none"
              autoComplete="username"
            />
          </Field>
        </YStack>
      </XStack>
      <Field id="phone" label="Phone (optional)" error={errors.phone}>
        <Input id="phone" value={phone} onChangeText={setPhone} inputMode="tel" autoComplete="tel" maxLength={24} />
      </Field>

      <YStack gap="$2">
        <H5>Emergency contact</H5>
        <Paragraph fontSize="$2" color="$color10" mt="$-1">
          Only event organizers can see it, and only for events you sign up for.
        </Paragraph>
        <XStack gap="$4" flexWrap="wrap">
          <YStack flex={1} minW={220}>
            <Field id="contactName" label="Name" error={errors.contactName}>
              <Input id="contactName" value={contactName} onChangeText={setContactName} maxLength={100} />
            </Field>
          </YStack>
          <YStack flex={1} minW={220}>
            <Field id="contactPhone" label="Phone" error={errors.contactPhone}>
              <Input id="contactPhone" value={contactPhone} onChangeText={setContactPhone} inputMode="tel" maxLength={24} />
            </Field>
          </YStack>
        </XStack>
      </YStack>

      <Field id="allergies" label="Allergies (optional)">
        <TextArea
          id="allergies"
          value={allergies}
          onChangeText={setAllergies}
          placeholder="e.g. peanuts, penicillin"
          placeholderTextColor="$color8"
          maxLength={500}
          minH={80}
        />
      </Field>

      {error && <ErrorText>{error}</ErrorText>}

      <XStack gap="$3" justify="flex-end">
        {onCancel && (
          <Button chromeless onPress={onCancel} disabled={submitting}>
            Cancel
          </Button>
        )}
        <Form.Trigger asChild disabled={submitting}>
          <Button theme="accent" icon={submitting ? <Spinner /> : undefined}>
            {user.profileComplete ? 'Save profile' : 'Continue'}
          </Button>
        </Form.Trigger>
      </XStack>
    </Form>
  );
}
