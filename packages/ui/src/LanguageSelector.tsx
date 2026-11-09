import { LOCALE_NAMES, LOCALES, useI18n } from '@events/shared';
import { Languages } from '@tamagui/lucide-icons-2';
import { Button, XStack } from 'tamagui';

/** Compact EN/ES toggle; each option is labelled in its own language so anyone can find theirs. */
export function LanguageSelector() {
  const { locale, setLocale, t } = useI18n();
  return (
    <XStack items="center" gap="$1" role="radiogroup" aria-label={t.language.label}>
      <Languages size={16} color="$color10" aria-hidden />
      {LOCALES.map((l) => (
        <Button
          key={l}
          size="$2"
          chromeless={l !== locale}
          theme={l === locale ? 'accent' : undefined}
          role="radio"
          aria-checked={l === locale}
          aria-label={LOCALE_NAMES[l]}
          onPress={() => setLocale(l)}
        >
          {l.toUpperCase()}
        </Button>
      ))}
    </XStack>
  );
}
