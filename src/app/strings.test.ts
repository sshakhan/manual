import { describe, expect, it } from 'vitest';
import { BUILTIN_STRINGS, UI_STRING_KEYS } from './strings';
import { BUILTIN_LOCALES } from '../content/builtins';

describe('builtin UI strings', () => {
  it('covers every bundled locale', () => {
    for (const locale of BUILTIN_LOCALES) {
      expect(BUILTIN_STRINGS[locale]).toBeDefined();
    }
  });

  it('defines every key in every bundled locale', () => {
    for (const locale of BUILTIN_LOCALES) {
      for (const key of UI_STRING_KEYS) {
        expect(BUILTIN_STRINGS[locale][key], `${locale}.${key}`).toBeTruthy();
      }
    }
  });

  it('lists a key for every field of the interface', () => {
    for (const locale of BUILTIN_LOCALES) {
      expect(Object.keys(BUILTIN_STRINGS[locale]).sort()).toEqual([...UI_STRING_KEYS].sort());
    }
  });

  // The courier manual shipped a Kazakh value that was the Russian pasted over.
  // Both apps have a test for this; the library inherits the guard.
  it('never repeats a Russian value as the Kazakh one', () => {
    for (const key of UI_STRING_KEYS) {
      expect(BUILTIN_STRINGS.kk[key], key).not.toBe(BUILTIN_STRINGS.ru[key]);
    }
  });

  it('includes the media placeholder label', () => {
    expect(UI_STRING_KEYS).toContain('mediaMissing');
    expect(BUILTIN_STRINGS.ru.mediaMissing).toContain('{src}');
    expect(BUILTIN_STRINGS.kk.mediaMissing).toContain('{src}');
  });
});
