import { builtinBlocks, createRegistry } from '@evrika/manual-kit';
import type { BuiltinBlock, Chapter, Manifest, ManualConfig } from '@evrika/manual-kit';
import manifestJson from '../content/manifest.json';
import { shortcutBlock, type ShortcutBlock } from './blocks/shortcut';

/**
 * The example's own locale set. `en` is deliberately not one of the library's
 * `BUILTIN_LOCALES` (`['ru', 'kk']`) — the config path for a locale the
 * library knows nothing about is exercised by something real rather than a
 * test double.
 */
export type ExampleLocale = 'ru' | 'kk' | 'en';

/** The nine built-ins plus the example's own second-party block. */
export type ExampleBlock = BuiltinBlock | ShortcutBlock;

function isExampleLocale(value: string): value is ExampleLocale {
  return value === 'ru' || value === 'kk' || value === 'en';
}

/**
 * `manifest.json`'s `locales` comes back as plain `string[]` even under
 * `resolveJsonModule` — JSON has no literal-type syntax — so this narrows it
 * once, here, with a type guard rather than asserting it at every call site.
 */
function manifestFor(raw: typeof manifestJson): Manifest<ExampleLocale> {
  const { locales } = raw;
  if (!locales.every(isExampleLocale)) {
    throw new Error(`example manifest declares a locale outside ru/kk/en: ${locales.join(', ')}`);
  }
  return { ...raw, locales };
}

const registry = createRegistry<ExampleBlock>([...builtinBlocks, shortcutBlock]);

/**
 * Lives apart from `main.tsx` so the test and the browser entry share the same
 * globs rather than duplicating them. Omits `root`: there is no `#root` in
 * jsdom, and `main.tsx` is the only caller with a real element to give it.
 */
export function exampleConfig(): Omit<ManualConfig<ExampleLocale, ExampleBlock>, 'root'> {
  return {
    brand: 'Example Manual',
    manifest: manifestFor(manifestJson),
    chapters: import.meta.glob<{ default: Chapter<ExampleBlock> }>('../content/*/*.json', {
      eager: true,
    }),
    media: import.meta.glob<string>('../content/media/*', {
      eager: true, query: '?url', import: 'default',
    }),
    locales: {
      list: ['ru', 'kk', 'en'],
      fallback: 'ru',
      labels: { ru: 'Русский', kk: 'Қазақ тілі', en: 'English' },
      strings: {
        // `en` is not bundled, so every UI string has to come from here in full
        // — a missing one is a startup error in `resolveConfig`, not a blank
        // label discovered by a reader.
        en: {
          languageGroup: 'Language',
          searchPlaceholder: 'Search the manual',
          searchEmpty: 'No results',
          searchHint: 'Type at least two characters',
          fallbackNotice: 'This section is not translated yet — showing Russian text.',
          chapterMissing: 'Chapter not found.',
          onThisPage: 'On this page',
          nextChapter: 'Next chapter',
          previousChapter: 'Previous chapter',
          openSections: 'Open sections',
          closeSections: 'Close sections',
          mediaMissing: 'Missing file: {src}',
        },
      },
    },
    blocks: registry,
    // Left at 'light' — see the brief's Step 7. Flip to 'dark' to eyeball the
    // dark palette, then revert; a consumer opts into 'dark' or 'system'.
    colorScheme: 'light',
  };
}
