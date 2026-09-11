import type { ReactNode } from 'react';
import type { AnyBlock, BuiltinBlock, Chapter, Manifest } from './content/types';
import { BUILTIN_LOCALE_LABELS, type BuiltinLocale } from './content/builtins';
import { BUILTIN_STRINGS, UI_STRING_KEYS, type UiStrings } from './app/strings';
import { createMediaResolver } from './app/context';
import { createContentSource, type ContentSource } from './content/source';
import { defaultRegistry } from './blocks/builtin';
import type { BlockRegistry } from './blocks/registry';
import type { RouteContext } from './app/route-types';

export interface Slots<L extends string = string> {
  renderBrand?: (ctx: RouteContext<L>) => ReactNode;
  renderSidebarFooter?: (ctx: RouteContext<L>) => ReactNode;
  renderChapterFooter?: (ctx: RouteContext<L>) => ReactNode;
  renderSearchEmpty?: (ctx: RouteContext<L> & { query: string }) => ReactNode;
}

export interface ManualConfig<
  L extends string = BuiltinLocale,
  B extends AnyBlock = BuiltinBlock,
> {
  root: HTMLElement;
  brand: string | ReactNode;
  manifest: Manifest<L>;
  /** `import.meta.glob('../content/*&#47;*.json', { eager: true })`, run by the consumer. */
  chapters: Record<string, { default: Chapter<B> }>;
  /** `import.meta.glob('../content/media/*', { eager: true, query: '?url', import: 'default' })`. */
  media?: Record<string, string>;
  locales?: {
    list?: readonly L[];
    fallback?: L;
    labels?: Record<L, string>;
    strings?: { [K in L]?: Partial<UiStrings> };
  };
  blocks?: BlockRegistry<B>;
  colorScheme?: 'light' | 'dark' | 'system';
  search?: { enabled?: boolean; minQueryLength?: number; maxResults?: number };
  routing?: 'hash' | 'memory';
  /**
   * Distinguishes this manual's remembered locale from another manual's in the
   * same browser. Defaults to a slug of `brand` when that is a string.
   *
   * Set it explicitly when `brand` is a `ReactNode` — a JSX logo cannot be
   * slugged, so every such manual would otherwise share one key and the two
   * would fight over the reader's language, which is the exact bug the
   * per-manual key exists to prevent.
   */
  storageKey?: string;
  document?: { title?: (ctx: RouteContext<L>) => string };
  slots?: Slots<L>;
}

export interface ResolvedConfig<L extends string, B extends AnyBlock> {
  root: HTMLElement;
  brand: string | ReactNode;
  locales: {
    list: readonly L[];
    fallback: L;
    labels: Record<L, string>;
    strings: Record<L, UiStrings>;
  };
  registry: BlockRegistry<B>;
  content: ContentSource<L, B>;
  resolveMedia: (src: string) => string | undefined;
  colorScheme: 'light' | 'dark' | 'system';
  search: { enabled: boolean; minQueryLength: number; maxResults: number };
  routing: 'hash' | 'memory';
  storageKey: string;
  documentTitle: (ctx: RouteContext<L>) => string;
  slots: Slots<L>;
}

/** `EG Delivery` → `eg-delivery`; anything that slugs to nothing → `default`. */
function brandSlug(brandText: string): string {
  const slug = brandText.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return slug === '' ? 'default' : slug;
}

/**
 * Config in, fully defaulted config out — and every rejection a manual can
 * have at startup.
 *
 * It throws rather than warning. A manual whose Kazakh chrome is silently
 * blank, or whose fallback locale is a typo, looks like a content bug and gets
 * chased through the content instead of the one line that caused it.
 */
export function resolveConfig<L extends string, B extends AnyBlock>(
  config: ManualConfig<L, B>,
): ResolvedConfig<L, B> {
  const list = config.locales?.list ?? config.manifest.locales;

  // Destructured rather than length-checked: this is the same guard, but it
  // narrows `firstLocale` to a string, so the fallback default below needs no
  // assertion.
  const [firstLocale] = list;
  if (!firstLocale) {
    throw new Error(
      'manual-kit: the manual declares at least one locale nowhere — set ' +
        'locales.list, or list them in manifest.json.',
    );
  }
  if (config.manifest.chapters.length === 0) {
    throw new Error(
      'manual-kit: the manifest has no chapters, so there is nothing to route ' +
        'to. Add at least one entry to manifest.json.',
    );
  }

  const fallback = config.locales?.fallback ?? firstLocale;
  if (!list.includes(fallback)) {
    throw new Error(
      `manual-kit: the fallback locale "${fallback}" is not in the locale ` +
        `list (${list.join(', ')}). It has to be one of them — it is what every ` +
        'other locale falls back to.',
    );
  }

  const labels = {} as Record<L, string>;
  const strings = {} as Record<L, UiStrings>;

  for (const locale of list) {
    const bundled = (BUILTIN_STRINGS as Record<string, UiStrings | undefined>)[locale];
    const override = config.locales?.strings?.[locale];
    const merged = { ...bundled, ...override } as Partial<UiStrings>;
    const missing = UI_STRING_KEYS.filter((key) => !merged[key]);

    /*
     * The strings are checked before the label so a locale with both wrong
     * reports both in one run. A consumer adding a locale the library bundles
     * nothing for has exactly that, and learning about the two a run at a time
     * is two round trips for no reason.
     */
    const alsoMissing =
      missing.length > 0
        ? ` It is also missing ${missing.length} UI string(s): ${missing.join(', ')}.`
        : '';

    const bundledLabel = (BUILTIN_LOCALE_LABELS as Record<string, string | undefined>)[locale];
    const label = config.locales?.labels?.[locale] ?? bundledLabel;
    if (!label) {
      throw new Error(
        `manual-kit: locale "${locale}" has no display label. Add it to ` +
          'locales.labels — a language\'s own name is the one thing the library ' +
          `cannot guess.${alsoMissing}`,
      );
    }
    labels[locale] = label;

    if (missing.length > 0) {
      throw new Error(
        `manual-kit: locale "${locale}" is missing ${missing.length} UI ` +
          `string(s): ${missing.join(', ')}. Supply them in ` +
          'locales.strings, or drop the locale from the list.',
      );
    }
    strings[locale] = merged as UiStrings;
  }

  const brandText = typeof config.brand === 'string' ? config.brand : '';
  const content = createContentSource<L, B>(config.manifest, config.chapters, { fallback });

  return {
    root: config.root,
    brand: config.brand,
    locales: { list, fallback, labels, strings },
    registry: config.blocks ?? (defaultRegistry as unknown as BlockRegistry<B>),
    content,
    resolveMedia: createMediaResolver(config.media),
    colorScheme: config.colorScheme ?? 'light',
    search: {
      enabled: config.search?.enabled ?? true,
      minQueryLength: config.search?.minQueryLength ?? 2,
      maxResults: config.search?.maxResults ?? 30,
    },
    routing: config.routing ?? 'hash',
    // Derived here rather than in `useRoute`, so every default lives in one
    // place. A brand that is a ReactNode, empty, or pure punctuation slugs to
    // nothing usable — those consumers pass `storageKey` themselves.
    storageKey: config.storageKey ?? `manual-kit:locale:${brandSlug(brandText)}`,
    // The chapter first, the product second: a reader with nine manual tabs
    // open is distinguishing between chapters, not between products.
    documentTitle:
      config.document?.title ??
      ((ctx) => {
        const title = content.loadChapter(ctx.locale, ctx.chapterId)?.chapter.title;
        return [title, brandText].filter(Boolean).join(' — ');
      }),
    slots: config.slots ?? {},
  };
}
