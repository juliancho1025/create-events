import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { en, type Messages } from './en';
import { es } from './es';

export type { Messages } from './en';

export const LOCALES = ['en', 'es'] as const;
export type Locale = (typeof LOCALES)[number];

export const MESSAGES: Record<Locale, Messages> = { en, es };

/** Shown in the language selector, each in its own language. */
export const LOCALE_NAMES: Record<Locale, string> = { en: 'English', es: 'Español' };

export const isLocale = (value: unknown): value is Locale => LOCALES.includes(value as Locale);

/** First supported language in a preference list such as `navigator.languages` ("es-CO" -> "es"). */
export function pickLocale(preferred: readonly string[], fallback: Locale = 'en'): Locale {
  for (const tag of preferred) {
    const base = tag.toLowerCase().split('-')[0];
    if (isLocale(base)) return base;
  }
  return fallback;
}

interface I18nContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: Messages;
}

const I18nContext = createContext<I18nContextValue | null>(null);

/**
 * Holds the current language. Platform-neutral: the app decides the initial
 * language and where to persist it (localStorage on the web, AsyncStorage on RN).
 */
export function I18nProvider({
  initialLocale,
  onLocaleChange,
  children,
}: {
  initialLocale: Locale;
  onLocaleChange?: (locale: Locale) => void;
  children: ReactNode;
}) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);
  const setLocale = useCallback(
    (next: Locale) => {
      setLocaleState(next);
      onLocaleChange?.(next);
    },
    [onLocaleChange],
  );
  const value = useMemo(() => ({ locale, setLocale, t: MESSAGES[locale] }), [locale, setLocale]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used inside <I18nProvider>');
  return ctx;
}

/** The current language's strings: `const t = useT(); t.events.title`. */
export const useT = () => useI18n().t;
