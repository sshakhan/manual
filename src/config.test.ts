import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { resolveConfig } from './config';
import { BUILTIN_STRINGS } from './app/strings';
import type { Chapter, Manifest } from './content/types';
import type { BuiltinBlock } from './content/types';

type L = 'ru' | 'kk';

const manifest: Manifest<L> = {
  version: 1,
  locales: ['ru', 'kk'],
  chapters: [{ id: 'start', file: '01-start.json' }],
};

const chapters = {
  '../content/ru/01-start.json': {
    default: { id: 'start', title: 'Начало', blocks: [] } as Chapter<BuiltinBlock>,
  },
};

const base = () => ({
  root: document.createElement('div'),
  brand: 'EG Delivery',
  manifest,
  chapters,
});

describe('resolveConfig defaults', () => {
  it('takes the locale list from the manifest', () => {
    expect(resolveConfig(base()).locales.list).toEqual(['ru', 'kk']);
  });

  it('defaults the fallback to the first declared locale', () => {
    expect(resolveConfig(base()).locales.fallback).toBe('ru');
  });

  it('supplies bundled labels and strings for ru/kk', () => {
    const { locales } = resolveConfig(base());
    expect(locales.labels).toEqual({ ru: 'Русский', kk: 'Қазақ тілі' });
    expect(locales.strings.kk.onThisPage).toBe('Осы бөлімде');
  });

  it('defaults to the built-in registry, light scheme, hash routing', () => {
    const resolved = resolveConfig(base());
    expect(resolved.registry.has('keys')).toBe(true);
    expect(resolved.colorScheme).toBe('light');
    expect(resolved.routing).toBe('hash');
  });

  it('defaults search on, at two characters and thirty results', () => {
    expect(resolveConfig(base()).search).toEqual({
      enabled: true, minQueryLength: 2, maxResults: 30,
    });
  });

  it('builds a content source over the passed chapters', () => {
    expect(resolveConfig(base()).content.tableOfContents('ru'))
      .toEqual([{ id: 'start', title: 'Начало' }]);
  });

  it('resolves no media when none was passed', () => {
    expect(resolveConfig(base()).resolveMedia('media/a.svg')).toBeUndefined();
  });

  it('defaults the document title to brand followed by chapter', () => {
    const title = resolveConfig(base()).documentTitle;
    expect(title({ locale: 'ru', chapterId: 'start' })).toBe('Начало — EG Delivery');
  });

  it('leaves slots empty rather than undefined', () => {
    expect(resolveConfig(base()).slots).toEqual({});
  });
});

describe('resolveConfig overrides', () => {
  it('deep-merges partial strings over the bundled ones', () => {
    const resolved = resolveConfig({
      ...base(),
      locales: { strings: { ru: { searchPlaceholder: 'Найти' } } },
    });
    expect(resolved.locales.strings.ru.searchPlaceholder).toBe('Найти');
    expect(resolved.locales.strings.ru.onThisPage).toBe(BUILTIN_STRINGS.ru.onThisPage);
    expect(resolved.locales.strings.kk).toEqual(BUILTIN_STRINGS.kk);
  });

  it('accepts a locale the library knows nothing about', () => {
    const en = {
      languageGroup: 'Language', searchPlaceholder: 'Search the manual',
      searchEmpty: 'Nothing found', searchHint: 'Type at least two characters',
      fallbackNotice: 'Not translated yet — showing Russian.',
      chapterMissing: 'Chapter not found.', onThisPage: 'On this page',
      nextChapter: 'Next chapter', previousChapter: 'Previous chapter',
      openSections: 'Open sections', closeSections: 'Close sections',
      mediaMissing: 'Missing file: {src}',
    };
    const resolved = resolveConfig({
      ...base(),
      manifest: { ...manifest, locales: ['ru', 'en'] } as unknown as Manifest<'ru' | 'en'>,
      locales: { labels: { ru: 'Русский', en: 'English' }, strings: { en } },
    } as never);
    expect(resolved.locales.list).toEqual(['ru', 'en']);
    // Optional-chained: casting the config `as never` widens `L` to `string`, so
    // this lookup is an index access and `noUncheckedIndexedAccess` types it as
    // possibly undefined. The assertion still fails loudly if it is.
    expect(resolved.locales.strings.en?.onThisPage).toBe('On this page');
  });

  it('honours an explicit fallback, list, scheme and search settings', () => {
    const resolved = resolveConfig({
      ...base(),
      locales: { list: ['kk', 'ru'], fallback: 'kk' },
      colorScheme: 'system',
      search: { minQueryLength: 3, maxResults: 5 },
      routing: 'memory',
    });
    expect(resolved.locales.fallback).toBe('kk');
    expect(resolved.colorScheme).toBe('system');
    expect(resolved.search).toEqual({ enabled: true, minQueryLength: 3, maxResults: 5 });
    expect(resolved.routing).toBe('memory');
  });

  it('lets an explicit storageKey win over the one derived from brand', () => {
    const resolved = resolveConfig({ ...base(), storageKey: 'acme-locale' });
    expect(resolved.storageKey).toBe('acme-locale');
  });

  it('falls back to a default storage key for a brand that is a ReactNode', () => {
    const resolved = resolveConfig({ ...base(), brand: createElement('span', null, 'Logo') });
    expect(resolved.storageKey).toBe('manual-kit:locale:default');
  });
});

describe('resolveConfig rejections', () => {
  it('rejects an empty chapter list — there would be nothing to route to', () => {
    expect(() => resolveConfig({ ...base(), manifest: { ...manifest, chapters: [] } }))
      .toThrow(/no chapters/i);
  });

  it('rejects an empty locale list', () => {
    expect(() => resolveConfig({ ...base(), locales: { list: [] } }))
      .toThrow(/at least one locale/i);
  });

  it('rejects a fallback that is not in the locale list', () => {
    expect(() => resolveConfig({ ...base(), locales: { fallback: 'de' as never } }))
      .toThrow(/fallback.*"de".*ru, kk/i);
  });

  it('names every missing key for an unknown locale', () => {
    let message = '';
    try {
      resolveConfig({
        ...base(),
        manifest: { ...manifest, locales: ['ru', 'en'] } as unknown as Manifest<'ru' | 'en'>,
      } as never);
    } catch (error) {
      message = (error as Error).message;
    }
    expect(message).toMatch(/"en"/);
    expect(message).toMatch(/onThisPage/);
    expect(message).toMatch(/mediaMissing/);
  });

  it('names the missing keys for a partially supplied locale', () => {
    expect(() =>
      resolveConfig({
        ...base(),
        manifest: { ...manifest, locales: ['ru', 'en'] } as unknown as Manifest<'ru' | 'en'>,
        locales: { labels: { ru: 'Русский', en: 'English' }, strings: { en: { onThisPage: 'On this page' } } },
      } as never),
    ).toThrow(/searchPlaceholder/);
  });

  it('rejects a locale with no display label', () => {
    expect(() =>
      resolveConfig({
        ...base(),
        manifest: { ...manifest, locales: ['ru', 'en'] } as unknown as Manifest<'ru' | 'en'>,
        locales: { strings: { en: BUILTIN_STRINGS.ru } },
      } as never),
    ).toThrow(/label/i);
  });
});
