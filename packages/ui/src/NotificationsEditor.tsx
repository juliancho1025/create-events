import { MAX_MINUTES_BEFORE, MAX_NOTIFICATIONS, useT, type Messages, type NotificationInput } from '@events/shared';
import { Plus, X } from '@tamagui/lucide-icons-2';
import { Button, Input, Paragraph, Text, XStack, YStack } from 'tamagui';

const UNITS = [
  { unit: 'minutes', minutes: 1 },
  { unit: 'hours', minutes: 60 },
  { unit: 'days', minutes: 24 * 60 },
] as const;
export type NotificationUnit = (typeof UNITS)[number]['unit'];

/** Editable row: amount stays a string while typing, like the capacity field. */
export interface NotificationDraft {
  amount: string;
  unit: NotificationUnit;
  message: string;
}

const suggestions = (t: Messages): { label: string; draft: NotificationDraft }[] => [
  { label: t.notifications.suggestionDay, draft: { amount: '1', unit: 'days', message: t.notifications.suggestionDayMessage } },
  { label: t.notifications.suggestionHour, draft: { amount: '1', unit: 'hours', message: t.notifications.suggestionHourMessage } },
];

/** Largest unit that represents the value exactly, so "1440" reads as "1 days" -> "1 day". */
export function toDraft({ minutesBefore, message }: NotificationInput): NotificationDraft {
  const { unit, minutes } = [...UNITS].reverse().find((u) => minutesBefore % u.minutes === 0) ?? UNITS[0];
  return { amount: String(minutesBefore / minutes), unit, message };
}

/** The draft as an API input, or an error message. */
export function fromDraft(draft: NotificationDraft, t: Messages): NotificationInput | string {
  const amount = Number(draft.amount);
  if (draft.amount.trim() === '' || !Number.isInteger(amount) || amount < 0) return t.notifications.errors.amount;
  const minutesBefore = amount * UNITS.find((u) => u.unit === draft.unit)!.minutes;
  if (minutesBefore > MAX_MINUTES_BEFORE) return t.notifications.errors.tooFar;
  if (!draft.message.trim()) return t.notifications.errors.message;
  return { minutesBefore, message: draft.message.trim() };
}

export function NotificationsEditor({
  value,
  onChange,
  errors,
  startsAt,
  now,
  sent = [],
}: {
  value: NotificationDraft[];
  onChange: (value: NotificationDraft[]) => void;
  /** Per-row validation messages, by index. */
  errors?: (string | undefined)[];
  /** To warn about notifications whose time has already passed. */
  startsAt: Date | null;
  /** Timestamp to compare against; captured once by the caller so rendering stays pure. */
  now: number;
  /** Already-sent notifications, shown read-only. */
  sent?: NotificationInput[];
}) {
  const t = useT();
  const full = value.length >= MAX_NOTIFICATIONS;
  const update = (i: number, patch: Partial<NotificationDraft>) =>
    onChange(value.map((d, j) => (j === i ? { ...d, ...patch } : d)));

  return (
    <YStack gap="$3">
      {sent.map((n, i) => (
        <XStack key={i} gap="$2" items="center" opacity={0.7}>
          <Text fontSize="$2" color="$color10" width={130}>
            {t.notifications.sent(describe(n.minutesBefore, t))}
          </Text>
          <Text fontSize="$3" flex={1}>
            {n.message}
          </Text>
        </XStack>
      ))}
      {value.length === 0 && sent.length === 0 && (
        <Paragraph color="$color10">{t.notifications.none}</Paragraph>
      )}
      {value.map((draft, i) => {
        const parsed = fromDraft(draft, t);
        const error = errors?.[i];
        const overdue =
          !error && typeof parsed !== 'string' && startsAt && startsAt.getTime() - parsed.minutesBefore * 60_000 < now;
        return (
          <YStack key={i} gap="$1.5" p="$2.5" rounded="$4" borderWidth={1} borderColor="$borderColor">
            <XStack gap="$2" items="center" flexWrap="wrap">
              <Input
                size="$3"
                width={70}
                value={draft.amount}
                onChangeText={(amount) => update(i, { amount })}
                inputMode="numeric"
                aria-label={t.notifications.howLong}
              />
              <XStack>
                {UNITS.map(({ unit }) => (
                  <Button
                    key={unit}
                    size="$2"
                    chromeless={draft.unit !== unit}
                    borderWidth={1}
                    borderColor="$borderColor"
                    aria-pressed={draft.unit === unit}
                    onPress={() => update(i, { unit })}
                  >
                    {t.notifications.units[unit]}
                  </Button>
                ))}
              </XStack>
              <Text fontSize="$3" color="$color10" flex={1}>
                {t.notifications.beforeStart}
              </Text>
              <Button
                size="$2"
                circular
                chromeless
                icon={<X size={14} />}
                aria-label={t.notifications.removeLabel}
                onPress={() => onChange(value.filter((_, j) => j !== i))}
              />
            </XStack>
            <Input
              size="$3"
              value={draft.message}
              onChangeText={(message) => update(i, { message })}
              placeholder={t.notifications.messagePlaceholder}
              placeholderTextColor="$color8"
              maxLength={200}
            />
            {error && (
              <Text fontSize="$2" color="$red10">
                {error}
              </Text>
            )}
            {overdue && (
              <Text fontSize="$2" color="$color10">
                {t.notifications.overdue}
              </Text>
            )}
          </YStack>
        );
      })}
      <XStack gap="$2" flexWrap="wrap">
        {suggestions(t).map(({ label, draft }) => (
          <Button
            key={label}
            size="$2"
            chromeless
            borderWidth={1}
            borderColor="$borderColor"
            rounded="$10"
            icon={<Plus size={12} />}
            disabled={full}
            onPress={() => onChange([...value, draft])}
          >
            {label}
          </Button>
        ))}
        <Button
          size="$2"
          chromeless
          borderWidth={1}
          borderColor="$borderColor"
          rounded="$10"
          icon={<Plus size={12} />}
          disabled={full}
          onPress={() => onChange([...value, { amount: '30', unit: 'minutes', message: '' }])}
        >
          {t.notifications.custom}
        </Button>
      </XStack>
    </YStack>
  );
}

function describe(minutesBefore: number, t: Messages): string {
  if (minutesBefore === 0) return t.notifications.atStart;
  const { amount, unit } = toDraft({ minutesBefore, message: '' });
  return t.notifications.before(amount, (amount === '1' ? t.notifications.unitsOne : t.notifications.units)[unit]);
}
