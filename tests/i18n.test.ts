import { describe, expect, it } from 'vitest';

import { LOCALES } from '../src/domain/types.ts';
import { STRINGS, detectLocale, translate } from '../src/i18n/index.ts';
import type { StringKey } from '../src/i18n/index.ts';

function placeholders(text: string): string[] {
  return [...text.matchAll(/\{(\w+)\}/g)].map((match) => match[1] ?? '').sort();
}

describe('string tables', () => {
  const keys = Object.keys(STRINGS.en).sort() as StringKey[];

  it('define the same keys in every locale', () => {
    for (const locale of LOCALES) {
      expect(Object.keys(STRINGS[locale]).sort()).toEqual(keys);
    }
  });

  it('have no empty strings', () => {
    for (const locale of LOCALES) {
      for (const key of keys) {
        expect(STRINGS[locale][key].trim(), `${locale}:${key}`).not.toBe('');
      }
    }
  });

  it('use the same placeholders in every locale', () => {
    for (const key of keys) {
      expect(placeholders(STRINGS.es[key]), key).toEqual(placeholders(STRINGS.en[key]));
    }
  });
});

describe('translate', () => {
  it('fills placeholders', () => {
    expect(translate('en', 'score.overall', { score: 80 })).toBe('80 out of 100');
    expect(translate('es', 'score.overall', { score: 80 })).toBe('80 de 100');
  });

  it('leaves an unfilled placeholder visible', () => {
    expect(translate('en', 'score.overall')).toBe('{score} out of 100');
  });
});

describe('detectLocale', () => {
  it('picks the first supported language', () => {
    expect(detectLocale(['qu-PE', 'en-GB', 'es'])).toBe('en');
    expect(detectLocale(['es-PE', 'en'])).toBe('es');
  });

  it('falls back to Spanish', () => {
    expect(detectLocale([])).toBe('es');
    expect(detectLocale(['fr-FR'])).toBe('es');
  });
});
