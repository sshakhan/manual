# manual-kit — a reusable shell for Evrika product manuals

Design, 2026-09-11.

## Why

Two manuals exist: `Evrika_Delivery_App/manual` (courier) and
`evrika-cashier-desktop/manual` (cashier). The second was copied from the first
almost verbatim. Their `src/` trees are 27 files and roughly 1,900 lines each,
and they differ in exactly four places:

- a `keys` block type the cashier manual has and the courier manual does not
  (`blocks/notices.tsx`, `blocks/Block.tsx`, `content/types.ts`,
  `search/search.ts`, and 30 lines of CSS),
- the content itself,
- the brand string,
- 37 lines of the 868-line stylesheet.

Everything else is duplicated. The duplication already costs: the courier
sidebar renders the literal string `Evrika Cashier`
(`Evrika_Delivery_App/manual/src/app/Sidebar.tsx:47`), because the file was
copied and that line was missed. A third manual would copy the bug forward.

This project extracts the shell into `@evrika/manual-kit`, a published package.
A new manual becomes content plus about thirty lines of configuration.

## Scope

In scope: the `~/Projects/manual` repository — library, example app, tests,
CLI, README.

Out of scope: changes to `Evrika_Delivery_App` or `evrika-cashier-desktop`.
Migrating the two existing manuals is a deliberate follow-up. The README
documents the recipe; nothing in either app repo is touched by this work. The
`example/` app is what validates the abstraction in the meantime.

## Decisions

| Question | Decision |
|---|---|
| Distribution | Private npm package `@evrika/manual-kit`, consumed by version (git tag or private registry) |
| Block types | Open registry over a built-in set of nine; consumers can register their own |
| Locales | Arbitrary, generic over `L extends string`; `ru`/`kk` UI strings bundled |
| CSS | Full rewrite: cascade layers, nesting, `oklch`/`color-mix`, container queries, `light-dark()` |
| Dark mode | Opt-in per consumer via `colorScheme`, default `light` |
| API shape | `<Manual>` / `renderManual()` by default; exported parts and slots as escape hatches |

### API shape

Three shapes were considered. A single config object and one mount function
gives the least boilerplate but makes any unanticipated layout a library
change. Exporting composable parts only (`<Sidebar>`, `<ChapterView>`, …)
maximises flexibility but forces every app to restate the three-column layout,
reintroducing the boilerplate this project removes.

The chosen shape is the hybrid: `renderManual()` covers the normal case in one
call, slots cover local variation, and the individual parts are exported for a
consumer that genuinely needs a different layout. It is the only shape that
serves both goals — less boilerplate *and* high customisability — at once.

## Architecture

```
~/Projects/manual/                        → @evrika/manual-kit
  src/
    index.ts            public API barrel
    Manual.tsx          the default three-column shell, slot-aware
    renderManual.ts     createRoot + <Manual>, the one-call entry point
    config.ts           ManualConfig, defaults, resolveConfig()
    content/
      types.ts          Chapter, Manifest, Block base types (generic over locale/block)
      source.ts         createContentSource() — lookup, locale fallback, TOC
    blocks/
      registry.ts       defineBlock(), createRegistry(), BlockSpec
      builtin/          heading paragraph list steps image video callout table keys
      inline.tsx        inline markup + anchor resolution
    app/
      Sidebar.tsx  ChapterView.tsx  OnThisPage.tsx
      route.ts  useRoute.ts  useActiveSection.ts
      strings.ts        UiStrings type + bundled ru/kk
    search/
      index.ts          index builder (reads searchText from the registry)
      SearchBox.tsx
    styles/
      manual.css        the layered stylesheet
      tokens.css        the token layer, imported first
    vite/
      manualViteConfig.ts
    cli/
      index.ts          manual-kit validate | schema | new-manual
  example/              a working two-locale manual with one custom block
  docs/
```

### Public API

```ts
// mounting
export function renderManual<L extends string, B extends BlockBase>(
  config: ManualConfig<L, B>,
): { unmount(): void };
export function Manual<L, B>(props: { config: ResolvedConfig<L, B> }): JSX.Element;

// configuration
export type { ManualConfig, ResolvedConfig, UiStrings, Slots };
export function resolveConfig<L, B>(config: ManualConfig<L, B>): ResolvedConfig<L, B>;

// blocks
export function defineBlock<T extends BlockBase>(spec: BlockSpec<T>): BlockSpec<T>;
// `any` rather than `AnyBlock` or `never`: `BlockSpec<T>` is *invariant* in T
// (covariant through `type: T['type']`, contravariant through `component`), so
// no concrete element type accepts a list of specs for different block types.
export function createRegistry(specs: readonly BlockSpec<any>[]): BlockRegistry;
export const builtinBlocks: readonly BlockSpec<any>[];
export type { BlockSpec, BlockRegistry, BlockBase, AnyBlock, AnchorResolver };

// content
export function createContentSource<L, B>(
  manifest: Manifest<L>,
  modules: Record<string, { default: Chapter<B> }>,
  options: { fallback: L },
): ContentSource<L, B>;
export type { Chapter, Manifest, ManifestChapter, ContentSource, LoadedChapter };
export type { BuiltinLocale, BuiltinBlock };   // 'ru' | 'kk'; the nine built-in block types

// parts, for consumers building their own layout
export { Sidebar, ChapterView, OnThisPage, SearchBox, BlockList };
export { useRoute, useActiveSection, useManual };

// build
export function manualViteConfig(options?: { outDir?: string }): UserConfig;
```

`@evrika/manual-kit/styles.css` is a separate export.

### Consumer surface

A whole manual's `src/main.tsx`:

```tsx
import { renderManual } from '@evrika/manual-kit';
import '@evrika/manual-kit/styles.css';
import './theme.css';
import manifest from '../content/manifest.json';

renderManual({
  root: document.getElementById('root')!,
  brand: 'EG Delivery',
  manifest,
  chapters: import.meta.glob('../content/*/*.json', { eager: true }),
  media: import.meta.glob('../content/media/*', {
    eager: true, query: '?url', import: 'default',
  }),
  locales: { list: ['ru', 'kk'], fallback: 'ru' },
  colorScheme: 'light',
});
```

The app keeps `content/`, `content/media/`, `theme.css`, `index.html`, and its
deploy configuration — the parts that genuinely differ. It keeps no `src/`
beyond the file above.

### ManualConfig

```ts
interface ManualConfig<L extends string = BuiltinLocale, B extends BlockBase = BuiltinBlock> {
  root: HTMLElement;
  brand: string | ReactNode;
  manifest: Manifest<L>;
  chapters: Record<string, { default: Chapter<B> }>;
  media?: Record<string, string>;     // asset path → bundled URL; see below
  locales?: {
    list?: readonly L[];              // default: manifest.locales
    fallback?: L;                     // default: first of list
    labels?: Record<L, string>;       // default: bundled endonyms for ru/kk
    strings?: DeepPartial<Record<L, UiStrings>>;
  };
  blocks?: BlockRegistry<B>;          // default: createRegistry(builtinBlocks)
  colorScheme?: 'light' | 'dark' | 'system';   // default 'light'
  search?: { enabled?: boolean; minQueryLength?: number; maxResults?: number };
  routing?: 'hash' | 'memory';        // default 'hash'
  document?: { title?: (ctx: RouteContext<L>) => string };
  slots?: Slots;
}

interface Slots {
  renderBrand?: (ctx: RouteContext) => ReactNode;
  renderSidebarFooter?: (ctx: RouteContext) => ReactNode;
  renderChapterFooter?: (ctx: RouteContext) => ReactNode;
  renderSearchEmpty?: (ctx: RouteContext & { query: string }) => ReactNode;
}
```

`resolveConfig()` is pure: config in, fully defaulted config out. It is where
invalid configuration is rejected, and it is unit-testable without a DOM.

Locale handling is generic over `L extends string`, so a third locale is a
config change rather than a library edit. `strings` is a deep partial, so
overriding one placeholder does not mean restating all eleven. A locale in
`list` with neither bundled strings nor an override makes `resolveConfig()`
throw, naming the locale and the missing keys — the current code renders blanks
instead.

### Block registry

Adding a block type to either manual today means editing four files —
`content/types.ts`, `blocks/Block.tsx`, `search/search.ts`,
`content/schema.json` — and the `never` exhaustiveness check in `Block.tsx`
catches only the second. That asymmetry is how the two shells drifted. One spec
per block replaces it:

```ts
interface BlockSpec<T extends BlockBase> {
  type: T['type'];
  component: ComponentType<{ block: T; resolveAnchor: AnchorResolver }>;
  searchText: (block: T) => string;
  schema: JSONSchema7;     // the oneOf fragment for this type
}
```

Renderer, search index, and JSON Schema are all derived from the registry.
`content/schema.json` therefore becomes a generated artifact
(`manual-kit schema`), and the schema can no longer disagree with the
renderer. Chapter JSON keeps its `$schema` reference so editors still get
autocomplete.

The nine built-ins are `heading`, `paragraph`, `list`, `steps`, `image`,
`video`, `callout`, `table`, `keys`. `keys` ships even though the courier
manual does not use it: an unused block type costs a consumer nothing, and
shipping it keeps the two existing manuals on identical code.

A block type present in content but absent from the registry fails
`manual-kit validate`. If one reaches the renderer anyway, it renders nothing
in production and a visible marker in development.

### Content source

`createContentSource(manifest, modules, { fallback })` returns
`getManifest`, `chapterList`, `loadRawChapter`, `loadChapter`,
`tableOfContents`, `allChapters` — the current `loader.ts` API, as a factory
rather than module-level singletons. The factory form is what lets the example
app and the tests hold several manuals in one process.

The fallback behaviour carries over unchanged: a chapter missing in the
requested locale renders the fallback locale's text with a notice, because a
translation gap is more usefully shown than hidden.

**Why the consumer runs the globs — both of them.** `loader.ts` currently calls
`import.meta.glob('../../content/*/*.json', { eager: true })`. Vite resolves
that specifier at build time relative to the file that calls it, so inside
`node_modules/@evrika/manual-kit` it would glob the package's own directory and
find nothing. Inverting it — consumer globs, library consumes the record — is
therefore not a stylistic preference but the only arrangement that works. It
also preserves the constraint the eager glob exists for: a page opened over
`file://` cannot `fetch()` its own JSON (opaque origin in both WebView2 and
WKWebView), so every chapter must be in the module graph for
`vite-plugin-singlefile` to inline it.

`blocks/media.tsx` runs a **second** glob of the same kind —
`import.meta.glob('../../content/media/*', { eager: true, query: '?url' })` —
which turns a stable content path like `media/kaspi-qr.svg` into the URL the
bundler produced. It inverts for exactly the same reason, and becomes
`config.media`. A consumer that ships no media omits it; every `image` and
`video` block then renders the missing-media placeholder, which is already the
designed behaviour for a named file that is not in the bundle.

That placeholder currently hardcodes the Russian `Нет файла: {src}`
(`blocks/media.tsx`). It becomes the `mediaMissing` UI string, so it follows
the reader's locale like the rest of the chrome.

### Search

The existing algorithm is unchanged. Two differences: the per-block text now
comes from the registry's `searchText` rather than a switch, and the index is
built lazily per locale and memoised instead of eagerly for all locales.

### Routing

Hash routing as today (`#/ru/payment#anchor`). `routing: 'memory'` is added for
tests and for embedding the shell where the URL is not ours to own.

## Styling

One stylesheet, six cascade layers:

```css
@layer tokens, base, layout, blocks, utilities, overrides;
```

Layers buy more than tidiness: unlayered CSS outranks every layer, so a
consumer's `theme.css` wins by default with no `!important` and no knowledge of
the layer order. `overrides` exists for a consumer that wants to be explicit.

Colours derive from a seed rather than from fourteen hand-picked hexes:

```css
--brand: oklch(55% 0.09 187);                                  /* today's #019AAC */
--brand-tint:   color-mix(in oklab, var(--brand) 12%, var(--surface));
--brand-strong: color-mix(in oklab, var(--brand) 80%, black);
--surface:      light-dark(#fff, oklch(21% 0.01 240));
```

Retheming is then one declaration, and derived tints stay in gamut instead of
being eyeballed. Semantic colours (`--warning`, `--danger`, `--success`) keep
their own seeds, since they carry meaning and must not track the brand.

Dark mode rides on `color-scheme`, set on `<html>` from `config.colorScheme`,
so `light-dark()` resolves both palettes without duplicate rule blocks and
without a `prefers-color-scheme` media query. Default `light` means neither
existing manual changes appearance when it migrates.

`@container manual (inline-size < 900px)` replaces the viewport `@media`
breakpoints. Beyond being more correct, it lets the shell be embedded in a
panel or a split view and still reflow — which the current CSS cannot do.

Also used, each for a reason: `@property` on numeric tokens, so a bad
`--sidebar-width` override falls back to its declared initial value rather than
collapsing the layout; nesting for block components; logical properties
throughout, leaving the manual RTL-ready; `clamp()` for the type scale;
`text-wrap: balance` on headings and `pretty` on body text;
`:has()` for state that currently requires a class from JS;
`scroll-margin-block-start` so anchors land below the sticky header;
`:focus-visible` and `prefers-reduced-motion`.

Baseline is 2023-and-later Chromium, Safari, and Firefox — appropriate for a
webview and a Firebase-hosted document. `@supports` guards are added only where
a miss would break layout, not where it would merely look plainer.

Every token is documented in `docs/tokens.md`, and the example app renders a
token reference page so overrides are discoverable rather than archaeological.

## Build and packaging

Vite library mode, ESM only. React and `react-dom` are peer dependencies
(`>=18`), never bundled. Types emitted with `vite-plugin-dts`.

```json
"exports": {
  ".": { "types": "./dist/index.d.ts", "import": "./dist/index.js" },
  "./styles.css": "./dist/styles.css",
  "./vite": { "types": "./dist/vite.d.ts", "import": "./dist/vite.js" }
}
```

The single-file build stays the consumer's own, because it is a deployment
choice rather than a library concern. `manualViteConfig()` returns the
`base`, `publicDir`, `assetsInlineLimit`, and `viteSingleFile()` block so each
app's `vite.config.ts` drops from about thirty lines to five.

Version 0.1.0 at first publish. The API may still move until both manuals have
migrated; it stabilises at 1.0.0 after that.

## CLI

`manual-kit`, replacing the per-repo `scripts/validate-content.ts`:

- `validate` — chapter JSON against the registry-generated schema; locale
  parity (every chapter present in every declared locale, reported rather than
  failed when a gap is intentional); anchor integrity (every internal link
  resolves); media existence (every `src` resolves on disk).
- `schema` — writes `content/schema.json` from the registry.
- `new-manual <dir>` — scaffolds `content/`, `index.html`, `main.tsx`,
  `theme.css`, `vite.config.ts`, `package.json`.

`validate` exits non-zero on error so it can gate a build.

## Testing

Vitest with jsdom and Testing Library, as both manuals use today.

Ported: `route`, `Sidebar`, `ChapterView`, `OnThisPage`, `Block`, `loader`,
`search` — seven existing suites, adjusted for the factory and registry APIs.

New:

- `resolveConfig` — defaults, deep-merged strings, and each rejection path
  (unknown fallback locale, locale without strings, empty manifest).
- registry — `defineBlock` typing, custom block rendering, custom block
  searchability, generated schema accepting valid and rejecting invalid content.
- content source — locale fallback, missing chapter, fallback locale itself
  missing, two independent sources in one process.
- CLI — `validate` on a fixture with a known anchor error, a known missing
  media file, and a clean fixture.

The `example/` app is the fixture for the integration-level tests and doubles
as the live demo. It registers one custom block, so the registry's extension
path is exercised by something real rather than by a test double.

## Risks

**The abstraction is unproven against real content until migration.** Migration
is deferred by scope, so `example/` carries that weight. It is therefore built
with two locales, a deliberate translation gap, and a custom block — not a
hello-world.

**Generic block types make the TypeScript harder to read.** `Chapter<B>`
threaded through the tree costs some clarity at the type level. Accepted: the
alternative is a closed union, which is what forced the fork.

**A `0.1.0` API will move.** Both consumers migrate later against a moving
target. Mitigated by pinning exact versions at migration time and stabilising
at 1.0.0 once both are on it.

## Migration recipe (for the follow-up, documented not executed)

Per app: delete `src/` except a new `main.tsx`; add the dependency; move the
`:root` overrides from `styles.css` into `theme.css`; replace `vite.config.ts`
with `manualViteConfig()`; delete `scripts/validate-content.ts` and point the
`validate` script at `manual-kit validate`; regenerate `content/schema.json`
with `manual-kit schema`. Content, media, and deploy configuration are
untouched.

For `Evrika_Delivery_App` specifically, the hardcoded `Evrika Cashier` in
`src/app/Sidebar.tsx:47` becomes `brand: 'EG Delivery'`, which fixes the
existing bug as a side effect.
