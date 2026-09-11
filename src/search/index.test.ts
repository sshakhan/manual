import { describe, expect, it } from 'vitest';
import { buildEntries, createSearchIndex, search } from './index';
import { createRegistry, defineBlock } from '../blocks/registry';
import { builtinBlocks, defaultRegistry } from '../blocks/builtin';
import { createContentSource } from '../content/source';
import type { BlockBase, BuiltinBlock, Chapter, Manifest } from '../content/types';

const options = { minQueryLength: 2, maxResults: 30 };

const chapter: Chapter<BuiltinBlock> = {
  id: 'payment',
  title: 'Оплата',
  blocks: [
    { type: 'heading', level: 2, id: 'qr', text: 'Kaspi QR' },
    { type: 'paragraph', text: 'Покажите QR клиенту и дождитесь ответа.' },
    { type: 'list', items: ['наличные', 'карта'] },
    { type: 'image', src: 'media/a.svg', alt: 'нет подписи' },
    { type: 'keys', combo: ['Ctrl', 'P'], text: 'печать чека' },
  ],
};

describe('buildEntries', () => {
  const entries = buildEntries([chapter], defaultRegistry);

  it('skips a block whose searchText is null', () => {
    expect(entries.some((entry) => entry.text.includes('нет подписи'))).toBe(false);
  });

  it('tags each entry with the nearest heading above it', () => {
    const body = entries.find((entry) => entry.text.startsWith('Покажите'));
    expect(body).toMatchObject({
      chapterId: 'payment', chapterTitle: 'Оплата',
      sectionId: 'qr', sectionTitle: 'Kaspi QR',
    });
  });

  it('indexes a block through its registered searchText', () => {
    expect(entries.some((entry) => entry.text === 'Ctrl + P печать чека')).toBe(true);
    expect(entries.some((entry) => entry.text === 'наличные карта')).toBe(true);
  });

  it('indexes a custom block type too', () => {
    interface NoteBlock extends BlockBase { type: 'note'; text: string }
    const noteBlock = defineBlock<NoteBlock>({
      type: 'note',
      component: () => null,
      searchText: (block) => `заметка ${block.text}`,
      schema: {},
    });
    const registry = createRegistry<BuiltinBlock | NoteBlock>([...builtinBlocks, noteBlock]);
    const entries = buildEntries(
      [{ id: 'c', title: 'C', blocks: [{ type: 'note', text: 'своё' }] }],
      registry,
    );
    expect(entries[0]?.text).toBe('заметка своё');
  });

  it('ignores a block type the registry does not know', () => {
    expect(buildEntries(
      [{ id: 'c', title: 'C', blocks: [{ type: 'nope' } as never] }],
      defaultRegistry,
    )).toEqual([]);
  });
});

describe('search', () => {
  const entries = buildEntries([chapter], defaultRegistry);

  it('returns nothing below the minimum query length', () => {
    expect(search(entries, 'о', options)).toEqual([]);
    expect(search(entries, '  ', options)).toEqual([]);
  });

  it('honours a configured minimum', () => {
    expect(search(entries, 'QR', { ...options, minQueryLength: 3 })).toEqual([]);
    expect(search(entries, 'QR', { ...options, minQueryLength: 2 }).length).toBeGreaterThan(0);
  });

  it('is case-insensitive', () => {
    expect(search(entries, 'kaspi', options).length).toBeGreaterThan(0);
  });

  it('ranks a heading match above a body match', () => {
    const hits = search(entries, 'qr', options);
    expect(hits[0]?.sectionTitle).toBe('Kaspi QR');
  });

  it('ranks a word-boundary match above one inside a word', () => {
    const inWord: typeof entries = [
      { chapterId: 'a', chapterTitle: 'A', text: 'прокассировать' },
      { chapterId: 'b', chapterTitle: 'B', text: 'касса открыта' },
    ];
    expect(search(inWord, 'касс', options)[0]?.chapterId).toBe('b');
  });

  it('caps results at the configured maximum', () => {
    const many = Array.from({ length: 50 }, (_, index) => ({
      chapterId: `c${index}`, chapterTitle: 'C', text: 'повтор',
    }));
    expect(search(many, 'повтор', { ...options, maxResults: 5 })).toHaveLength(5);
  });

  it('builds an elided snippet around the match', () => {
    const long = [{ chapterId: 'a', chapterTitle: 'A', text: `${'x'.repeat(200)} игла ${'y'.repeat(200)}` }];
    const snippet = search(long, 'игла', options)[0]?.snippet ?? '';
    expect(snippet).toContain('игла');
    expect(snippet.startsWith('…')).toBe(true);
    expect(snippet.endsWith('…')).toBe(true);
  });
});

describe('createSearchIndex', () => {
  const manifest: Manifest<'ru' | 'kk'> = {
    version: 1, locales: ['ru', 'kk'],
    chapters: [{ id: 'payment', file: '01-payment.json' }],
  };
  const modules = {
    '../content/ru/01-payment.json': { default: chapter },
    '../content/kk/01-payment.json': {
      default: { ...chapter, title: 'Төлем' } as Chapter<BuiltinBlock>,
    },
  };

  it('indexes per locale', () => {
    const index = createSearchIndex(
      createContentSource<'ru' | 'kk', BuiltinBlock>(manifest, modules, { fallback: 'ru' }),
      defaultRegistry,
    );
    expect(index.entriesFor('kk')[0]?.chapterTitle).toBe('Төлем');
    expect(index.entriesFor('ru')[0]?.chapterTitle).toBe('Оплата');
  });

  it('memoises per locale, returning the same array', () => {
    const index = createSearchIndex(
      createContentSource<'ru' | 'kk', BuiltinBlock>(manifest, modules, { fallback: 'ru' }),
      defaultRegistry,
    );
    expect(index.entriesFor('ru')).toBe(index.entriesFor('ru'));
  });

  it('does not share its cache with another manual', () => {
    const make = (title: string) =>
      createSearchIndex(
        createContentSource<'ru' | 'kk', BuiltinBlock>(
          manifest,
          { '../content/ru/01-payment.json': { default: { ...chapter, title } } },
          { fallback: 'ru' },
        ),
        defaultRegistry,
      );
    expect(make('Первый').entriesFor('ru')[0]?.chapterTitle).toBe('Первый');
    expect(make('Второй').entriesFor('ru')[0]?.chapterTitle).toBe('Второй');
  });
});
