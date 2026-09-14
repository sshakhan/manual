export const VERSION = '0.1.1';

// The shell and its entry point.
export { Manual } from './Manual';
export { renderManual } from './renderManual';

// Config.
export { resolveConfig } from './config';
export type { ManualConfig, ResolvedConfig, Slots } from './config';

// Routing.
export type { RouteContext } from './app/route-types';
export { routeHref, anchorResolver, parseHash } from './app/route';
export { useRoute } from './app/useRoute';

// Strings.
export type { UiStrings } from './app/strings';
export { BUILTIN_STRINGS, UI_STRING_KEYS } from './app/strings';

// Manual context.
export { ManualProvider, useManual, createMediaResolver } from './app/context';

// Parts.
export { Sidebar } from './app/Sidebar';
export { ChapterView } from './app/ChapterView';
export { OnThisPage } from './app/OnThisPage';
export { useActiveSection } from './app/useActiveSection';
export { SearchBox } from './search/SearchBox';
export { BlockList } from './blocks/BlockList';

// Block registry.
export { defineBlock, createRegistry } from './blocks/registry';
export type {
  BlockSpec, BlockRegistry, BlockProps, AnchorResolver, JsonSchema,
} from './blocks/registry';

// Built-in blocks.
export {
  builtinBlocks, defaultRegistry,
  headingBlock, paragraphBlock, listBlock, stepsBlock,
  imageBlock, videoBlock, calloutBlock, tableBlock, keysBlock,
} from './blocks/builtin';

// Content.
export { createContentSource } from './content/source';
export type { ContentSource, LoadedChapter } from './content/source';
export type {
  BlockBase, AnyBlock, Chapter, Manifest, ManifestChapter, BuiltinBlock,
  HeadingBlock, ParagraphBlock, ListBlock, StepsBlock,
  ImageBlock, VideoBlock, CalloutBlock, TableBlock, KeysBlock,
} from './content/types';
export { BUILTIN_LOCALES, BUILTIN_LOCALE_LABELS } from './content/builtins';
export type { BuiltinLocale } from './content/builtins';

// Search.
export { createSearchIndex, buildEntries, search } from './search/index';
export type { SearchEntry, SearchHit } from './search/index';
