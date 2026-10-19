import { RECOMMENDED_METRICS } from '@events/shared';
import { Plus, X } from '@tamagui/lucide-icons-2';
import { useState } from 'react';
import { Button, Input, Paragraph, Text, XStack, YStack } from 'tamagui';

export const MAX_METRICS = 10;
const MAX_METRIC_LENGTH = 40;
/** Mirrors the API's key derivation closely enough to catch duplicates while typing. */
const sameMetric = (a: string, b: string) =>
  a.toLowerCase().replace(/[^a-z0-9]+/g, '') === b.toLowerCase().replace(/[^a-z0-9]+/g, '');

/** Chips for the tracked metrics, one-click re-adds for removed recommendations, and a free-text add. */
export function MetricsEditor({ value, onChange }: { value: string[]; onChange: (value: string[]) => void }) {
  const [draft, setDraft] = useState('');
  const full = value.length >= MAX_METRICS;
  const has = (label: string) => value.some((m) => sameMetric(m, label));
  const add = (label: string) => {
    const trimmed = label.trim();
    if (!trimmed || full || has(trimmed)) return;
    onChange([...value, trimmed]);
    setDraft('');
  };
  const suggestions = RECOMMENDED_METRICS.filter((m) => !has(m));

  return (
    <YStack gap="$2.5">
      <XStack gap="$2" flexWrap="wrap">
        {value.length === 0 && <Paragraph color="$color10">No metrics: attendees can't be marked for this event.</Paragraph>}
        {value.map((label) => (
          <XStack key={label} bg="$color4" pl="$3" pr="$1" py="$1" rounded="$10" items="center" gap="$1">
            <Text fontSize="$3">{label}</Text>
            <Button
              size="$1"
              circular
              chromeless
              icon={<X size={12} />}
              aria-label={`Remove ${label}`}
              onPress={() => onChange(value.filter((m) => m !== label))}
            />
          </XStack>
        ))}
        {suggestions.map((label) => (
          <Button key={label} size="$2" chromeless borderWidth={1} borderColor="$borderColor" rounded="$10" icon={<Plus size={12} />} disabled={full} onPress={() => add(label)}>
            {label}
          </Button>
        ))}
      </XStack>
      <XStack gap="$2">
        <Input
          flex={1}
          size="$3"
          value={draft}
          onChangeText={setDraft}
          placeholder={full ? `Up to ${MAX_METRICS} metrics` : 'Add a metric, e.g. Dress code'}
          placeholderTextColor="$color8"
          maxLength={MAX_METRIC_LENGTH}
          disabled={full}
          onSubmitEditing={() => add(draft)}
          // Enter adds the metric instead of submitting the whole form.
          onKeyPress={(e) => {
            if (e.nativeEvent.key === 'Enter') {
              if ('preventDefault' in e) e.preventDefault();
              add(draft);
            }
          }}
        />
        <Button size="$3" disabled={full || !draft.trim() || has(draft)} onPress={() => add(draft)}>
          Add
        </Button>
      </XStack>
    </YStack>
  );
}
