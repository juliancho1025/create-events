import type { DateTimeInputProps, ImageInputProps } from '@events/ui';
import { ImagePlus } from '@tamagui/lucide-icons-2';
import { useEffect, useRef } from 'react';
import { Button, Image, Input, Paragraph, XStack, YStack } from 'tamagui';

// Web implementations of the EventForm "ports". A React Native app would supply
// @react-native-community/datetimepicker and expo-image-picker versions instead.

const pad = (n: number) => String(n).padStart(2, '0');
/** <input type="datetime-local"> works in local time without a timezone suffix. */
const toLocalInputValue = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;

export function WebDateTimeInput({ id, value, onChange }: DateTimeInputProps) {
  return (
    <Input
      id={id}
      type="datetime-local"
      value={value ? toLocalInputValue(value) : ''}
      onChange={(e) => {
        const raw = (e.target as HTMLInputElement).value;
        onChange(raw ? new Date(raw) : null);
      }}
    />
  );
}

export function WebImageInput({ value, existingUri, onChange }: ImageInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const preview = value?.previewUri ?? existingUri;

  // Release the object URL when it's replaced or the form unmounts.
  useEffect(() => () => void (value && URL.revokeObjectURL(value.previewUri)), [value]);

  return (
    <YStack gap="$3">
      {preview && (
        <Image src={preview} width="100%" maxW={480} aspectRatio={16 / 9} objectFit="cover" rounded="$4" alt="Preview" />
      )}
      <XStack gap="$3" items="center">
        <Button icon={<ImagePlus size={16} />} onPress={() => inputRef.current?.click()}>
          {preview ? 'Replace image' : 'Choose image'}
        </Button>
        <Paragraph fontSize="$2" color="$color10">
          JPEG, PNG, WebP or GIF · max 5 MB
        </Paragraph>
      </XStack>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = ''; // allow re-picking the same file
          if (file) onChange({ file, previewUri: URL.createObjectURL(file) });
        }}
      />
    </YStack>
  );
}
