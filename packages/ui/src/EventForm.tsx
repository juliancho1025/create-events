import type { EventInput, UploadableImage } from '@events/shared';
import { useState, type ComponentType } from 'react';
import { Button, Form, Input, Label, Paragraph, Spinner, TextArea, Theme, XStack, YStack } from 'tamagui';

export interface PickedImage {
  file: UploadableImage;
  /** Something an <Image src> can display (object URL on web, file:// URI on mobile). */
  previewUri: string;
}

/**
 * Platform "ports": the web app passes <input type="datetime-local"> / <input type="file">
 * implementations, a React Native app would pass a native date picker / expo-image-picker.
 */
export interface DateTimeInputProps {
  id: string;
  value: Date | null;
  onChange: (value: Date | null) => void;
}
export interface ImageInputProps {
  value: PickedImage | null;
  /** Current image when editing an existing event. */
  existingUri?: string;
  onChange: (value: PickedImage | null) => void;
}

export interface EventFormProps {
  mode: 'create' | 'edit';
  initial?: { name: string; address: string; description: string; startsAt: Date; capacity: number; imageUri: string };
  DateTimeInput: ComponentType<DateTimeInputProps>;
  ImageInput: ComponentType<ImageInputProps>;
  onSubmit: (values: EventInput) => void;
  onCancel?: () => void;
  submitting?: boolean;
  /** Server-side error message, shown under the form. */
  error?: string | null;
}

type Errors = Partial<Record<'name' | 'address' | 'description' | 'startsAt' | 'capacity' | 'image', string>>;

export function EventForm({
  mode,
  initial,
  DateTimeInput,
  ImageInput,
  onSubmit,
  onCancel,
  submitting,
  error,
}: EventFormProps) {
  const [name, setName] = useState(initial?.name ?? '');
  const [address, setAddress] = useState(initial?.address ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [startsAt, setStartsAt] = useState<Date | null>(initial?.startsAt ?? null);
  const [capacity, setCapacity] = useState(initial ? String(initial.capacity) : '20');
  const [image, setImage] = useState<PickedImage | null>(null);
  // Errors appear after the first submit attempt, then update live as fields are fixed.
  const [submitted, setSubmitted] = useState(false);

  const validate = (): Errors => {
    const e: Errors = {};
    if (!name.trim()) e.name = 'Name is required';
    if (!address.trim()) e.address = 'Address is required';
    if (!description.trim()) e.description = 'Description is required';
    if (!startsAt) e.startsAt = 'Date and time are required';
    else if (mode === 'create' && startsAt.getTime() <= Date.now()) e.startsAt = 'Must be in the future';
    const cap = Number(capacity);
    if (!Number.isInteger(cap) || cap < 1) e.capacity = 'Must be a whole number of at least 1';
    if (mode === 'create' && !image) e.image = 'An image is required';
    return e;
  };

  const errors: Errors = submitted ? validate() : {};

  const submit = () => {
    setSubmitted(true);
    if (Object.keys(validate()).length) return;
    onSubmit({
      name: name.trim(),
      address: address.trim(),
      description: description.trim(),
      startsAt: startsAt!,
      capacity: Number(capacity),
      image: image?.file,
    });
  };

  return (
    <Form onSubmit={submit} gap="$4">
      <Field id="name" label="Name" error={errors.name}>
        <Input id="name" value={name} onChangeText={setName} placeholder="Spring Boot meetup" placeholderTextColor="$color8" maxLength={120} />
      </Field>
      <Field id="address" label="Address" error={errors.address}>
        <Input id="address" value={address} onChangeText={setAddress} placeholder="123 Main St, Springfield" placeholderTextColor="$color8" maxLength={300} />
      </Field>
      <XStack gap="$4" flexWrap="wrap">
        <YStack flex={2} minW={220}>
          <Field id="startsAt" label="Starts at" error={errors.startsAt}>
            <DateTimeInput id="startsAt" value={startsAt} onChange={setStartsAt} />
          </Field>
        </YStack>
        <YStack flex={1} minW={120}>
          <Field id="capacity" label="Capacity" error={errors.capacity}>
            <Input id="capacity" value={capacity} onChangeText={setCapacity} inputMode="numeric" />
          </Field>
        </YStack>
      </XStack>
      <Field id="description" label="Description" error={errors.description}>
        <TextArea id="description" value={description} onChangeText={setDescription} minH={140} maxLength={5000} />
      </Field>
      <Field id="image" label="Image" error={errors.image}>
        <ImageInput value={image} existingUri={initial?.imageUri} onChange={setImage} />
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
            {mode === 'create' ? 'Create event' : 'Save changes'}
          </Button>
        </Form.Trigger>
      </XStack>
    </Form>
  );
}

function Field({ id, label, error, children }: { id: string; label: string; error?: string; children: React.ReactNode }) {
  return (
    <YStack gap="$1.5">
      <Label htmlFor={id} lineHeight="$1">
        {label}
      </Label>
      {children}
      {error && <ErrorText>{error}</ErrorText>}
    </YStack>
  );
}

export function ErrorText({ children }: { children: React.ReactNode }) {
  return (
    <Theme name="red">
      <Paragraph color="$color10" fontSize="$3">
        {children}
      </Paragraph>
    </Theme>
  );
}
