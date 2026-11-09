import { useApi, useRemoveAvatar, useT, useUploadAvatar, type User } from '@events/shared';
import { ErrorText, initials } from '@events/ui';
import { Camera, Trash2 } from '@tamagui/lucide-icons-2';
import { useRef } from 'react';
import { Avatar, Button, Paragraph, Spinner, Text, XStack, YStack } from 'tamagui';

/** Profile photo with upload/remove. Uploads right away; it isn't part of the profile form's Save. */
export function AvatarPicker({ user }: { user: User }) {
  const api = useApi();
  const t = useT();
  const inputRef = useRef<HTMLInputElement>(null);
  const upload = useUploadAvatar();
  const remove = useRemoveAvatar();
  const pending = upload.isPending || remove.isPending;
  const error = upload.error ?? remove.error;

  return (
    <XStack gap="$4" items="center" flexWrap="wrap">
      <Avatar circular size="$8">
        {user.avatarUrl && <Avatar.Image src={api.resolveUrl(user.avatarUrl)} />}
        <Avatar.Fallback bg="$color5" items="center" justify="center">
          <Text fontSize="$7" fontWeight="600">
            {initials(user.name)}
          </Text>
        </Avatar.Fallback>
      </Avatar>
      <YStack gap="$2" flex={1} minW={200}>
        <XStack gap="$2" flexWrap="wrap">
          <Button
            size="$3"
            icon={upload.isPending ? <Spinner /> : <Camera size={16} />}
            disabled={pending}
            onPress={() => inputRef.current?.click()}
          >
            {user.avatarUrl ? t.profile.changePhoto : t.profile.uploadPhoto}
          </Button>
          {user.hasUploadedAvatar && (
            <Button
              size="$3"
              chromeless
              theme="red"
              icon={remove.isPending ? <Spinner /> : <Trash2 size={16} />}
              disabled={pending}
              onPress={() => remove.mutate()}
            >
              {t.common.remove}
            </Button>
          )}
        </XStack>
        <Paragraph fontSize="$2" color="$color10">
          {t.common.imageHint}
        </Paragraph>
        {error && <ErrorText>{error.message}</ErrorText>}
      </YStack>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = ''; // allow re-picking the same file
          if (file) upload.mutate(file);
        }}
      />
    </XStack>
  );
}
