import { describe, expect, it } from 'vitest';
import { createContentSource } from './source';
import type { Chapter, Manifest } from './types';
import type { BuiltinBlock } from './types';

type L = 'ru' | 'kk';

const manifest: Manifest<L> = {
  version: 1,
  locales: ['ru', 'kk'],
  chapters: [
    { id: 'getting-started', file: '01-getting-started.json' },
    { id: 'payment', file: '02-payment.json' },
  ],
};

function chapter(id: string, title: string): { default: Chapter<BuiltinBlock> } {
  return { default: { id, title, blocks: [{ type: 'paragraph', text: `${id} body` }] } };
}

// Kazakh is missing 'payment' on purpose: a translation gap is the state this
// module exists to handle, and it is the one both apps actually ship with.
const modules = {
  '../content/ru/01-getting-started.json': chapter('getting-started', 'Начало'),
  '../content/ru/02-payment.json': chapter('payment', 'Оплата'),
  '../content/kk/01-getting-started.json': chapter('getting-started', 'Бастау'),
};

const source = createContentSource<L, BuiltinBlock>(manifest, modules, { fallback: 'ru' });

describe('chapterList', () => {
  it('is the manifest order, not the glob order', () => {
    expect(source.chapterList().map((c) => c.id)).toEqual(['getting-started', 'payment']);
  });
});

describe('loadRawChapter', () => {
  it('finds a chapter present in the requested locale', () => {
    expect(source.loadRawChapter('kk', 'getting-started')?.title).toBe('Бастау');
  });

  it('returns null for a locale that lacks it, without falling back', () => {
    expect(source.loadRawChapter('kk', 'payment')).toBeNull();
  });

  it('returns null for a chapter absent from the manifest', () => {
    expect(source.loadRawChapter('ru', 'nope')).toBeNull();
  });
});

describe('loadChapter', () => {
  it('returns the requested locale when it has the chapter', () => {
    const loaded = source.loadChapter('kk', 'getting-started');
    expect(loaded).toEqual({
      chapter: expect.objectContaining({ title: 'Бастау' }),
      locale: 'kk',
      isFallback: false,
    });
  });

  it('falls back and says so, rather than returning a blank page', () => {
    const loaded = source.loadChapter('kk', 'payment');
    expect(loaded?.locale).toBe('ru');
    expect(loaded?.isFallback).toBe(true);
    expect(loaded?.chapter.title).toBe('Оплата');
  });

  it('returns null when even the fallback locale lacks it', () => {
    const thin = createContentSource<L, BuiltinBlock>(
      { ...manifest, chapters: [{ id: 'ghost', file: '99-ghost.json' }] },
      modules,
      { fallback: 'ru' },
    );
    expect(thin.loadChapter('kk', 'ghost')).toBeNull();
  });

  it('does not report a fallback when the requested locale *is* the fallback', () => {
    expect(source.loadChapter('ru', 'payment')?.isFallback).toBe(false);
  });
});

describe('tableOfContents', () => {
  it('titles every manifest chapter, falling back where needed', () => {
    expect(source.tableOfContents('kk')).toEqual([
      { id: 'getting-started', title: 'Бастау' },
      { id: 'payment', title: 'Оплата' },
    ]);
  });

  it('falls back to the chapter id when nothing resolves at all', () => {
    const thin = createContentSource<L, BuiltinBlock>(
      { ...manifest, chapters: [{ id: 'ghost', file: '99-ghost.json' }] },
      modules,
      { fallback: 'ru' },
    );
    expect(thin.tableOfContents('ru')).toEqual([{ id: 'ghost', title: 'ghost' }]);
  });
});

describe('allChapters', () => {
  it('returns every resolvable chapter in manifest order', () => {
    expect(source.allChapters('kk').map((c) => c.title)).toEqual(['Бастау', 'Оплата']);
  });
});

describe('independence', () => {
  it('holds two manuals in one process without sharing state', () => {
    const other = createContentSource<L, BuiltinBlock>(
      { version: 1, locales: ['ru'], chapters: [{ id: 'solo', file: '01-solo.json' }] },
      { '../content/ru/01-solo.json': chapter('solo', 'Другое') },
      { fallback: 'ru' },
    );
    expect(other.tableOfContents('ru')).toEqual([{ id: 'solo', title: 'Другое' }]);
    expect(source.tableOfContents('ru')[0]?.title).toBe('Начало');
  });
});
