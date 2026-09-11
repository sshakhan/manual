import { describe, expect, it } from 'vitest';
import { isLocaleOf } from './types';
import { BUILTIN_LOCALES, BUILTIN_LOCALE_LABELS } from './builtins';

describe('isLocaleOf', () => {
  const isLocale = isLocaleOf(['ru', 'kk'] as const);

  it('accepts a declared locale', () => {
    expect(isLocale('ru')).toBe(true);
    expect(isLocale('kk')).toBe(true);
  });

  it('rejects anything else', () => {
    expect(isLocale('en')).toBe(false);
    expect(isLocale('')).toBe(false);
    expect(isLocale('RU')).toBe(false);
  });

  it('is built per locale list, not per hardcoded set', () => {
    const isNordic = isLocaleOf(['fi', 'sv'] as const);
    expect(isNordic('fi')).toBe(true);
    expect(isNordic('ru')).toBe(false);
  });
});

describe('builtin locales', () => {
  it('ships ru and kk with their endonyms', () => {
    expect(BUILTIN_LOCALES).toEqual(['ru', 'kk']);
    expect(BUILTIN_LOCALE_LABELS).toEqual({ ru: 'Русский', kk: 'Қазақ тілі' });
  });
});
