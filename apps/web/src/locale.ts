import { isLocale, pickLocale, type Locale } from '@events/shared';

const KEY = 'events.locale';

/** The language picked before on this browser, else the browser's preferred one (Spanish or English). */
export function initialLocale(): Locale {
  try {
    const saved = localStorage.getItem(KEY);
    if (isLocale(saved)) return saved;
  } catch {
    // storage blocked (private mode): fall through to the browser language
  }
  return pickLocale(navigator.languages ?? [navigator.language]);
}

export function saveLocale(locale: Locale): void {
  document.documentElement.lang = locale;
  try {
    localStorage.setItem(KEY, locale);
  } catch {
    // not persisted; the choice still applies until the page is reloaded
  }
}
