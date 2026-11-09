import { useT, type ProfileInput, type User } from '@events/shared';
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
  const t = useT();
  const [name, setName] = useState(user.name);
  const [username, setUsername] = useState(user.username ?? '');
  const [phone, setPhone] = useState(user.phone ?? '');
  const [contactName, setContactName] = useState(user.emergencyContact?.name ?? '');
  const [contactPhone, setContactPhone] = useState(user.emergencyContact?.phone ?? '');
  const [allergies, setAllergies] = useState(user.allergies ?? '');
  const [submitted, setSubmitted] = useState(false);

  const validate = (): Errors => {
    const e: Errors = {};
    if (!name.trim()) e.name = t.profile.errors.name;
    const handle = username.trim().toLowerCase();
    if (!handle) e.username = t.profile.errors.username;
    else if (!USERNAME.test(handle)) e.username = t.profile.errors.usernameFormat;
    if (phone.trim() && !PHONE.test(phone.trim())) e.phone = t.profile.errors.phone;
    if (!contactName.trim()) e.contactName = t.profile.errors.name;
    if (!contactPhone.trim()) e.contactPhone = t.profile.errors.contactPhone;
    else if (!PHONE.test(contactPhone.trim())) e.contactPhone = t.profile.errors.phone;
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
          <Field id="name" label={t.profile.name} error={errors.name}>
            <Input id="name" value={name} onChangeText={setName} maxLength={100} autoComplete="name" />
          </Field>
        </YStack>
        <YStack flex={1} minW={220}>
          <Field id="username" label={t.profile.username} error={errors.username}>
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
      <Field id="phone" label={t.profile.phone} error={errors.phone}>
        <Input id="phone" value={phone} onChangeText={setPhone} inputMode="tel" autoComplete="tel" maxLength={24} />
      </Field>

      <YStack gap="$2">
        <H5>{t.profile.emergencyContact}</H5>
        <Paragraph fontSize="$2" color="$color10" mt="$-1">
          {t.profile.emergencyHint}
        </Paragraph>
        <XStack gap="$4" flexWrap="wrap">
          <YStack flex={1} minW={220}>
            <Field id="contactName" label={t.profile.name} error={errors.contactName}>
              <Input id="contactName" value={contactName} onChangeText={setContactName} maxLength={100} />
            </Field>
          </YStack>
          <YStack flex={1} minW={220}>
            <Field id="contactPhone" label={t.profile.contactPhone} error={errors.contactPhone}>
              <Input id="contactPhone" value={contactPhone} onChangeText={setContactPhone} inputMode="tel" maxLength={24} />
            </Field>
          </YStack>
        </XStack>
      </YStack>

      <Field id="allergies" label={t.profile.allergies}>
        <TextArea
          id="allergies"
          value={allergies}
          onChangeText={setAllergies}
          placeholder={t.profile.allergiesPlaceholder}
          placeholderTextColor="$color8"
          maxLength={500}
          minH={80}
        />
      </Field>

      {error && <ErrorText>{error}</ErrorText>}

      <XStack gap="$3" justify="flex-end">
        {onCancel && (
          <Button chromeless onPress={onCancel} disabled={submitting}>
            {t.common.cancel}
          </Button>
        )}
        <Form.Trigger asChild disabled={submitting}>
          <Button theme="accent" icon={submitting ? <Spinner /> : undefined}>
            {user.profileComplete ? t.profile.save : t.profile.continue}
          </Button>
        </Form.Trigger>
      </XStack>
    </Form>
  );
}
