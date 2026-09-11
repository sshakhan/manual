import type { AnyBlock, Chapter, Manifest, ManifestChapter } from './types';

export interface LoadedChapter<L extends string, B extends AnyBlock> {
  chapter: Chapter<B>;
  /** The locale actually rendered — differs from the requested one on fallback. */
  locale: L;
  /** True when the requested locale had no file and the fallback is being shown. */
  isFallback: boolean;
}

export interface ContentSource<L extends string, B extends AnyBlock> {
  manifest: Manifest<L>;
  chapterList(): ManifestChapter[];
  loadRawChapter(locale: L, id: string): Chapter<B> | null;
  loadChapter(locale: L, id: string): LoadedChapter<L, B> | null;
  tableOfContents(locale: L): Array<{ id: string; title: string }>;
  allChapters(locale: L): Chapter<B>[];
}

/**
 * The manual's content, from a record of statically imported chapters.
 *
 * `modules` is what `import.meta.glob('../content/*&#47;*.json', { eager: true })`
 * returns in the **consumer's** entry file. It is not globbed here, for two
 * reasons: Vite resolves a glob specifier relative to the file that calls it,
 * so from inside `node_modules` this module would glob the package rather than
 * the app — and the eager, static form is what lets
 * `vite-plugin-singlefile` inline every chapter, which is what makes a manual
 * opened over `file://` work at all. A page on an opaque origin (WebView2,
 * WKWebView) cannot `fetch()` its own JSON.
 */
export function createContentSource<L extends string, B extends AnyBlock>(
  manifest: Manifest<L>,
  modules: Record<string, { default: Chapter<B> }>,
  options: { fallback: L },
): ContentSource<L, B> {
  // Keyed by `<locale>/<file>`, because the consumer's glob prefix depends on
  // where their entry file sits and the library cannot know it.
  //
  // This assumes a manifest `file` is a bare filename. A `file` naming a
  // subdirectory would key as `<subdir>/<file>` and lose its locale, so every
  // locale would miss it and the chapter would look untranslated rather than
  // misconfigured. `manual-kit validate` rejects that, which is the right place
  // for it — the failure is in the content, not here.
  const byPath = new Map<string, Chapter<B>>();
  for (const [key, module] of Object.entries(modules)) {
    const segments = key.split('/');
    const tail = segments.slice(-2).join('/');
    if (tail) byPath.set(tail, module.default);
  }

  const entryFor = (id: string): ManifestChapter | undefined =>
    manifest.chapters.find((chapter) => chapter.id === id);

  function loadRawChapter(locale: L, id: string): Chapter<B> | null {
    const entry = entryFor(id);
    if (!entry) return null;
    return byPath.get(`${locale}/${entry.file}`) ?? null;
  }

  /**
   * Falls back rather than showing a blank page: a missing translation is a
   * gap, and the fallback text with a notice is more use to a reader than
   * nothing. `ChapterView` renders `strings.fallbackNotice` when `isFallback`.
   */
  function loadChapter(locale: L, id: string): LoadedChapter<L, B> | null {
    const requested = loadRawChapter(locale, id);
    if (requested) return { chapter: requested, locale, isFallback: false };

    if (locale === options.fallback) return null;

    const fallback = loadRawChapter(options.fallback, id);
    if (!fallback) return null;

    return { chapter: fallback, locale: options.fallback, isFallback: true };
  }

  return {
    manifest,
    chapterList: () => manifest.chapters,
    loadRawChapter,
    loadChapter,
    tableOfContents: (locale) =>
      manifest.chapters.map((entry) => ({
        id: entry.id,
        title: loadChapter(locale, entry.id)?.chapter.title ?? entry.id,
      })),
    allChapters: (locale) =>
      manifest.chapters
        .map((entry) => loadChapter(locale, entry.id)?.chapter)
        .filter((chapter): chapter is Chapter<B> => chapter !== undefined),
  };
}
