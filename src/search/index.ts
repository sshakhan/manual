import type { AnyBlock, Chapter } from '../content/types';
import type { ContentSource } from '../content/source';
import type { BlockRegistry } from '../blocks/registry';

/**
 * Search over the manual.
 *
 * There is **no build-time index file**: every chapter is already in the
 * bundle, so an index built in memory costs one pass over a few hundred blocks
 * and cannot fall out of step with the content the way a generated file can.
 * No `lunr`/`flexsearch` either — the corpus is small, and Cyrillic stemming
 * in those is a fight that buys nothing here.
 */
export interface SearchEntry {
  chapterId: string;
  chapterTitle: string;
  /** Nearest heading above this block — where a hit actually lands. */
  sectionId?: string;
  sectionTitle?: string;
  text: string;
}

export interface SearchHit extends SearchEntry {
  score: number;
  snippet: string;
}

const SNIPPET_RADIUS = 60;

/** Flattens a block to the text worth searching; `null` when it has none. */
function textOf<B extends AnyBlock>(block: B, registry: BlockRegistry<B>): string | null {
  return registry.get(block.type)?.searchText(block) ?? null;
}

// No `L` type parameter: unlike `createSearchIndex`, this operates on chapters
// already resolved to one locale, so it has no locale of its own to be generic
// over.
export function buildEntries<B extends AnyBlock>(
  chapters: Chapter<B>[],
  registry: BlockRegistry<B>,
): SearchEntry[] {
  const entries: SearchEntry[] = [];

  for (const chapter of chapters) {
    let sectionId: string | undefined;
    let sectionTitle: string | undefined;

    for (const block of chapter.blocks) {
      // `id` is generic to every block (`BlockBase`); a heading's registered
      // `searchText` is exactly its title, so both are readable without
      // narrowing `block` to `HeadingBlock`.
      const text = textOf(block, registry);
      if (block.type === 'heading') {
        sectionId = block.id;
        sectionTitle = text ?? sectionTitle;
      }

      if (!text) continue;

      entries.push({
        chapterId: chapter.id,
        chapterTitle: chapter.title,
        sectionId,
        sectionTitle,
        text,
      });
    }
  }

  return entries;
}

/**
 * The index, built once per locale on first use.
 *
 * There is **no build-time index file**: every chapter is already in the
 * bundle, so an index built in memory costs one pass over a few hundred blocks
 * and cannot fall out of step with the content the way a generated file can.
 * No `lunr`/`flexsearch` either — the corpus is small, and Cyrillic stemming
 * in those is a fight that buys nothing here.
 *
 * The cache is per index instance rather than module-level: two manuals in one
 * process (the example app, the tests) would otherwise answer each other's
 * queries.
 */
export function createSearchIndex<L extends string, B extends AnyBlock>(
  content: ContentSource<L, B>,
  registry: BlockRegistry<B>,
): { entriesFor(locale: L): SearchEntry[] } {
  const cache = new Map<L, SearchEntry[]>();

  return {
    entriesFor(locale) {
      const cached = cache.get(locale);
      if (cached) return cached;

      const entries = buildEntries(content.allChapters(locale), registry);
      cache.set(locale, entries);
      return entries;
    },
  };
}

/**
 * Scores a match. A hit in a heading outranks one in body text, and a match at
 * a word boundary outranks one inside a word — «касса» should find «Касса», not
 * rank «прокассировать» alongside it.
 */
function score(entry: SearchEntry, query: string): number {
  const haystack = entry.text.toLowerCase();
  const at = haystack.indexOf(query);
  if (at === -1) return 0;

  const previous = at === 0 ? undefined : haystack[at - 1];
  const atWordStart = previous === undefined || /[\s(«"'\-–—/]/.test(previous);
  const isHeading = entry.sectionTitle?.toLowerCase() === haystack;

  return (isHeading ? 4 : 1) + (atWordStart ? 2 : 0);
}

function snippetFor(text: string, query: string): string {
  const at = text.toLowerCase().indexOf(query);
  if (at === -1) return text.slice(0, SNIPPET_RADIUS * 2);

  const start = Math.max(0, at - SNIPPET_RADIUS);
  const end = Math.min(text.length, at + query.length + SNIPPET_RADIUS);

  return `${start > 0 ? '…' : ''}${text.slice(start, end)}${end < text.length ? '…' : ''}`;
}

export function search(
  entries: SearchEntry[],
  rawQuery: string,
  options: { minQueryLength: number; maxResults: number },
): SearchHit[] {
  const query = rawQuery.trim().toLowerCase();
  if (query.length < options.minQueryLength) return [];

  return entries
    .map((entry) => ({
      ...entry,
      score: score(entry, query),
      snippet: snippetFor(entry.text, query),
    }))
    .filter((hit) => hit.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, options.maxResults);
}
