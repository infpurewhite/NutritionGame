/**
 * String table access. All user-facing copy lives in `en.ts` and `es.ts`
 * (SPEC section 2); components never hold literal text.
 */
import { LOCALES } from '../domain/types.ts';
import type { Locale } from '../domain/types.ts';
import { en } from './en.ts';
import type { StringKey } from './en.ts';
import { es } from './es.ts';

export type { StringKey };

export const STRINGS: Readonly<Record<Locale, Readonly<Record<StringKey, string>>>> = { en, es };

/** Spanish is the default: the primary audience is in Peru, Bolivia and Ecuador. */
export const DEFAULT_LOCALE: Locale = 'es';

/** Language names are autonyms and are deliberately not translated. */
export const LOCALE_NAMES: Readonly<Record<Locale, string>> = { es: 'Español', en: 'English' };

export type Params = Readonly<Record<string, string | number>>;

/** Look up `key` in `locale` and fill `{name}` placeholders. */
export function translate(locale: Locale, key: StringKey, params: Params = {}): string {
  return STRINGS[locale][key].replace(/\{(\w+)\}/g, (match, name: string) =>
    name in params ? String(params[name]) : match,
  );
}

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (LOCALES as readonly string[]).includes(value);
}

/** First supported language in the browser's preference list, else the default. */
export function detectLocale(preferred: readonly string[]): Locale {
  for (const tag of preferred) {
    const primary = tag.toLowerCase().split('-')[0];
    if (isLocale(primary)) return primary;
  }
  return DEFAULT_LOCALE;
}
