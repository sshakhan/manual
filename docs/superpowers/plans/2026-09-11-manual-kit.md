# manual-kit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `@evrika/manual-kit` — a reusable, themeable React shell for Evrika product manuals — so a new manual is content plus ~30 lines of config instead of a 1,900-line copy-paste.

**Architecture:** A published ESM package. The block vocabulary is an open registry (component + search extractor + JSON Schema fragment per block) rather than a closed union, so a consumer adds block types without forking. Locales are generic over `string` with `ru`/`kk` chrome bundled. The consumer runs both `import.meta.glob`s (chapters and media) and passes the records in, because Vite resolves glob specifiers relative to the calling file and a library inside `node_modules` cannot see the app's content. Styling is one layered stylesheet driven by CSS custom properties.

**Tech Stack:** TypeScript 5.6, React 18 (peer, `>=18`), Vite 5 library mode, `vite-plugin-dts`, Vitest 2 + jsdom + `@testing-library/react`, Ajv 8 (CLI only).

**Spec:** `docs/superpowers/specs/2026-09-11-manual-kit-design.md` — read it before Task 1. The plan argues from the spec; executors read both.

**Reference implementation:** the two existing manuals, which this package generalises. Paths below are absolute and the files exist on disk — read them when a task says to port:
- `~/Projects/Evrika_Delivery_App/manual/` (courier; no `keys` block)
- `~/Projects/evrika-cashier-desktop/manual/` (cashier; has `keys`)

When both have a file, port from the **cashier** copy: it is the superset.

## Global Constraints

- Package name `@evrika/manual-kit`, version `0.1.0`, `"type": "module"`, ESM only, `"private": false`.
- `react` and `react-dom` are **peer** dependencies at `>=18`, and appear in `devDependencies` too (for tests). They are never bundled — `build.rollupOptions.external` must list both plus `react/jsx-runtime`.
- No new runtime dependencies. The package's `dependencies` stay empty; `ajv` is a `dependency` only because the CLI needs it at runtime, and the CLI is a separate entry point. Nothing in `src/` outside `src/cli/` may import it.
- Locale types are generic: `L extends string`. No file outside `src/app/strings.ts` and `src/content/builtins.ts` may hardcode `'ru'` or `'kk'`.
- No user-visible string is hardcoded in a component. Every one comes from `UiStrings`. Grep for
  Cyrillic in `src/` must return nothing outside three sanctioned places: `app/strings.ts` (the
  chrome strings themselves), `content/builtins.ts` (the two language endonyms — a language's own
  name is never translated), and `cli/` (developer-facing validator messages, deliberately kept
  in the reference implementation's Russian wording because the content authors read them).
  The constraint binds **non-test** files only: tests and fixtures carry Cyrillic content on
  purpose, since the manual they render is written in it, and asserting on Latin placeholder text
  would prove nothing about a Russian-and-Kazakh product manual. It also binds **string literals,
  not comments** — `MissingMedia.tsx` legitimately quotes the «Нет файла» it replaced, because a
  comment explaining why a string moved is worth more than a comment that dances around naming
  it.
- Every block type is defined in exactly one file under `src/blocks/builtin/`, exporting one `BlockSpec` with all three of `component`, `searchText`, `schema`.
- CSS baseline: 2023-and-later Chromium, Safari, Firefox. `@layer`, native nesting, `color-mix()`, `light-dark()`, `@container`, `@property` are all used unguarded. `@supports` guards only where a miss breaks layout.
- Cascade layer order is exactly `@layer tokens, base, layout, blocks, utilities, overrides;` and it is declared once, at the top of `src/styles/manual.css`.
- Tests: Vitest, `environment: 'jsdom'`, `globals: true`, `include: ['src/**/*.test.{ts,tsx}', 'example/**/*.test.{ts,tsx}']`.
- Commit after every task. Conventional Commit prefixes (`feat:`, `test:`, `docs:`, `chore:`, `fix:`). End every commit message with:
  `Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>`
- `noUncheckedIndexedAccess` is on, so every index and every regex capture group reads as
  `T | undefined`. The reference repos do not have it enabled, so **ported code will need
  narrowing added**. Narrow it — `if (m?.[1] && m[2])`, `?? fallback`, an early return — rather
  than reaching for `!` or a cast. Where a regex quantifier is `+`, a matched group can never be
  the empty string, so a truthiness check is exactly equivalent to an existence check and costs
  nothing. Known sites: `blocks/inline.tsx` (both capture groups), `search/index.ts` `score()`
  (`haystack[at - 1]` feeding `RegExp.test`).
  Like the Cyrillic rule, this binds **non-test** files: a test asserting on `JsonSchema`
  (deliberately `Record<string, unknown>`, because the library does not model JSON Schema) has
  nothing to narrow, and a chain of `typeof` guards there would bury the assertion it exists to
  make. Even so, prefer `toMatchObject` to a cast wherever it reads as well or better.
- Code comments explain *why*, in English, matching the density of the reference implementation — which is heavily commented at decision points and silent elsewhere. Do not comment what the code already says.

---

### Task 1: Repo scaffold and toolchain

**Files:**
- Create: `package.json`, `tsconfig.json`, `vite.config.ts`, `.gitignore` (exists — verify), `src/index.ts`
- Test: `src/scaffold.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: a working `npm test`, `npm run build`, `npm run typecheck`. Every later task depends on these three commands.

- [ ] **Step 1: Write the failing test**

Create `src/scaffold.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { VERSION } from './index';

describe('package scaffold', () => {
  it('exports its version', () => {
    expect(VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it('runs in a DOM environment', () => {
    expect(typeof document).toBe('object');
    expect(document.createElement('div')).toBeInstanceOf(HTMLElement);
  });
});
```

- [ ] **Step 2: Run it to make sure it fails**

Run: `cd ~/Projects/manual && npx vitest run src/scaffold.test.ts`
Expected: FAIL — there is no `package.json` yet, so the command itself errors (`npx` cannot find vitest). That is the expected failure for this step.

- [ ] **Step 3: Write `package.json`**

```json
{
  "name": "@evrika/manual-kit",
  "version": "0.1.0",
  "description": "Reusable, themeable shell for Evrika product manuals",
  "license": "UNLICENSED",
  "private": false,
  "type": "module",
  "files": ["dist"],
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "bin": { "manual-kit": "./dist/cli/index.js" },
  "exports": {
    ".": { "types": "./dist/index.d.ts", "import": "./dist/index.js" },
    "./styles.css": "./dist/styles.css",
    "./vite": { "types": "./dist/vite.d.ts", "import": "./dist/vite.js" },
    "./package.json": "./package.json"
  },
  "scripts": {
    "build": "npm run typecheck && vite build",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest",
    "example": "vite --config example/vite.config.ts"
  },
  "peerDependencies": {
    "react": ">=18",
    "react-dom": ">=18"
  },
  "dependencies": {
    "ajv": "^8.17.1"
  },
  "devDependencies": {
    "@testing-library/react": "^16.0.1",
    "@types/node": "^26.5.0",
    "@types/react": "^18.3.12",
    "@types/react-dom": "^18.3.1",
    "@vitejs/plugin-react": "^4.3.4",
    "jsdom": "^25.0.1",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "typescript": "^5.6.3",
    "vite": "^5.4.11",
    "vite-plugin-dts": "^4.3.0",
    "vite-plugin-singlefile": "^2.0.3",
    "vitest": "^2.1.8"
  }
}
```

`vite-plugin-singlefile` is a devDependency, not a dependency: `manualViteConfig()` (Task 14) imports it, and consumers get it through their own devDependencies. Task 14 revisits this — leave it here for now.

- [ ] **Step 4: Write `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "isolatedModules": true,
    "verbatimModuleSyntax": true,
    "resolveJsonModule": true,
    "skipLibCheck": true,
    "noEmit": true,
    "types": ["vitest/globals", "node"]
  },
  "include": ["src", "example", "vite.config.ts"]
}
```

`noUncheckedIndexedAccess` is on deliberately: the registry and the content source are both keyed lookups that can miss, and the compiler should force those to be handled. It will make some ported code need an explicit guard — that is the point.

- [ ] **Step 5: Write `vite.config.ts`**

```ts
import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import dts from 'vite-plugin-dts';

export default defineConfig({
  plugins: [react(), dts({ include: ['src'], exclude: ['src/**/*.test.*'] })],
  build: {
    lib: {
      entry: {
        index: resolve(__dirname, 'src/index.ts'),
        vite: resolve(__dirname, 'src/vite/index.ts'),
        'cli/index': resolve(__dirname, 'src/cli/index.ts'),
      },
      formats: ['es'],
    },
    rollupOptions: {
      external: ['react', 'react-dom', 'react-dom/client', 'react/jsx-runtime',
                 'ajv', 'node:fs', 'node:path', 'node:url', 'node:process'],
      output: { assetFileNames: 'styles.css' },
    },
    sourcemap: true,
    emptyOutDir: true,
  },
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.test.{ts,tsx}', 'example/**/*.test.{ts,tsx}'],
  },
});
```

The `vite` and `cli/index` entries do not exist until Tasks 14 and 15. Until then `npm run build` fails on them, which is why Step 8 only runs `test` and `typecheck`. Do not create stub files to make the build pass early — a stub that gets forgotten ships as a broken export.

- [ ] **Step 6: Write `src/index.ts`**

```ts
export const VERSION = '0.1.0';
```

- [ ] **Step 7: Install and run the test**

Run: `cd ~/Projects/manual && npm install && npx vitest run src/scaffold.test.ts`
Expected: PASS, 2 tests.

- [ ] **Step 8: Verify typecheck passes**

Run: `cd ~/Projects/manual && npm run typecheck`
Expected: no output, exit 0.

- [ ] **Step 9: Commit**

```bash
cd ~/Projects/manual
git add package.json package-lock.json tsconfig.json vite.config.ts src/index.ts src/scaffold.test.ts
git commit -m "chore: scaffold the manual-kit package

Vite library mode with three entries (index, vite helper, CLI), React as a
peer dependency so a consumer's copy is the only one in the tree, and
noUncheckedIndexedAccess on because the registry and content source are
both lookups that can miss.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: Generic content types

**Files:**
- Create: `src/content/types.ts`, `src/content/builtins.ts`
- Test: `src/content/types.test.ts`
- Reference: `~/Projects/evrika-cashier-desktop/manual/src/content/types.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `interface BlockBase { id?: string }`
  - `type AnyBlock = BlockBase & { type: string }`
  - `interface Chapter<B extends AnyBlock> { id: string; title: string; blocks: B[] }`
  - `interface ManifestChapter { id: string; file: string }`
  - `interface Manifest<L extends string> { version: number; locales: L[]; chapters: ManifestChapter[] }`
  - `function isLocaleOf<L extends string>(locales: readonly L[]): (value: string) => value is L`
  - From `builtins.ts`: `type BuiltinLocale = 'ru' | 'kk'`, `const BUILTIN_LOCALES`, `const BUILTIN_LOCALE_LABELS`
  - Block interfaces: `HeadingBlock`, `ParagraphBlock`, `ListBlock`, `StepsBlock`, `ImageBlock`, `VideoBlock`, `CalloutBlock`, `TableBlock`, `KeysBlock`, `type CalloutVariant`, `type BuiltinBlock` (the union of the nine)

- [ ] **Step 1: Write the failing test**

Create `src/content/types.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { isLocaleOf } from './types';
import { BUILTIN_LOCALES, BUILTIN_LOCALE_LABELS } from './builtins';

describe('isLocaleOf', () => {
  const isLocale = isLocaleOf(['ru', 'kk'] as const);

  it('accepts a declared locale', () => {
    expect(isLocale('ru')).toBe(true);
    expect(isLocale('kk')).toBe(true);
  });

  it('rejects anything else', () => {
    expect(isLocale('en')).toBe(false);
    expect(isLocale('')).toBe(false);
    expect(isLocale('RU')).toBe(false);
  });

  it('is built per locale list, not per hardcoded set', () => {
    const isNordic = isLocaleOf(['fi', 'sv'] as const);
    expect(isNordic('fi')).toBe(true);
    expect(isNordic('ru')).toBe(false);
  });
});

describe('builtin locales', () => {
  it('ships ru and kk with their endonyms', () => {
    expect(BUILTIN_LOCALES).toEqual(['ru', 'kk']);
    expect(BUILTIN_LOCALE_LABELS).toEqual({ ru: 'Русский', kk: 'Қазақ тілі' });
  });
});
```

- [ ] **Step 2: Run it to make sure it fails**

Run: `cd ~/Projects/manual && npx vitest run src/content/types.test.ts`
Expected: FAIL — `Failed to resolve import './types'`.

- [ ] **Step 3: Write `src/content/types.ts`**

Port the block interfaces from the cashier reference verbatim — including its doc comment about `text` carrying no HTML and no Markdown, which is a rule the whole design rests on. Three changes from the reference:

1. `Chapter` becomes generic: `Chapter<B extends AnyBlock = BuiltinBlock>` with `blocks: B[]`.
2. `Manifest` becomes generic: `Manifest<L extends string = BuiltinLocale>` with `locales: L[]`.
3. `LOCALES`, `Locale`, `FALLBACK_LOCALE`, and `isLocale` are **deleted**. The locale set is no longer a library constant. `isLocale` becomes the factory below, and the fallback locale is config.

```ts
export interface BlockBase {
  /** Anchor target. Optional everywhere, required on headings. */
  id?: string;
}

/** The loosest thing the registry can hold: a block whose type it does not know. */
export type AnyBlock = BlockBase & { type: string };

export interface Chapter<B extends AnyBlock = BuiltinBlock> {
  id: string;
  title: string;
  blocks: B[];
}

export interface ManifestChapter {
  id: string;
  file: string;
}

export interface Manifest<L extends string = BuiltinLocale> {
  version: number;
  locales: L[];
  chapters: ManifestChapter[];
}

/**
 * A type guard for one manual's locale list.
 *
 * A factory rather than a constant because the locale set is now the
 * consumer's: the library has no business knowing which languages a given
 * manual is written in.
 */
export function isLocaleOf<L extends string>(
  locales: readonly L[],
): (value: string) => value is L {
  return (value): value is L => (locales as readonly string[]).includes(value);
}
```

Add the nine block interfaces beneath, copied from the cashier reference (`HeadingBlock` through `KeysBlock`), then:

```ts
export type BuiltinBlock =
  | HeadingBlock | ParagraphBlock | ListBlock | StepsBlock
  | ImageBlock | VideoBlock | CalloutBlock | TableBlock | KeysBlock;
```

Import `BuiltinLocale` from `./builtins`.

- [ ] **Step 4: Write `src/content/builtins.ts`**

```ts
/**
 * The two locales both existing manuals are written in.
 *
 * They live here, apart from the generic machinery, because they are a
 * *convenience* rather than a constraint: a consumer that declares
 * `['ru', 'kk']` gets labels and chrome for free, and a consumer that declares
 * anything else supplies its own. Nothing in the library branches on these
 * values.
 */
export const BUILTIN_LOCALES = ['ru', 'kk'] as const;

export type BuiltinLocale = (typeof BUILTIN_LOCALES)[number];

/**
 * A language's own name is never translated. The Kazakh one is spelled the way
 * the apps themselves spell it (`profileLanguageKazakh` in the delivery app's
 * `lib/l10n/arb`, which holds `Қазақ тілі` in the Russian ARB too), so a reader
 * meets one name for the language rather than two.
 */
export const BUILTIN_LOCALE_LABELS: Record<BuiltinLocale, string> = {
  ru: 'Русский',
  kk: 'Қазақ тілі',
};
```

- [ ] **Step 5: Run the tests**

Run: `cd ~/Projects/manual && npx vitest run src/content/types.test.ts && npm run typecheck`
Expected: PASS, 4 tests; typecheck clean.

- [ ] **Step 6: Commit**

```bash
cd ~/Projects/manual
git add src/content/types.ts src/content/builtins.ts src/content/types.test.ts
git commit -m "feat: make chapter and manifest types generic over locale and block

The reference implementation pins LOCALES and FALLBACK_LOCALE as library
constants, which is why a third locale meant editing the library. Both
become config; isLocale becomes a factory over a declared list. ru/kk
survive as a convenience in builtins.ts, which nothing branches on.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: Block registry

**Files:**
- Create: `src/blocks/registry.ts`
- Test: `src/blocks/registry.test.tsx` — `.tsx`, not `.ts`: the test defines throwaway block
  components, so it contains JSX

**Interfaces:**
- Consumes: `AnyBlock`, `BlockBase` from `src/content/types.ts` (Task 2).
- Produces:
  - `type AnchorResolver = (target: string) => string`
  - `interface BlockProps<T> { block: T; resolveAnchor: AnchorResolver }`
  - `interface BlockSpec<T extends AnyBlock>` with `type: T['type']`, `component: ComponentType<BlockProps<T>>`, `searchText: (block: T) => string | null`, `schema: JsonSchema`
  - `type JsonSchema = Record<string, unknown>`
  - `function defineBlock<T extends AnyBlock>(spec: BlockSpec<T>): BlockSpec<T>`
  - `interface BlockRegistry<B extends AnyBlock>` with `get(type: string): BlockSpec<B> | undefined`, `has(type: string): boolean`, `types(): string[]`, `specs(): readonly BlockSpec<B>[]`
  - `function createRegistry<B extends AnyBlock>(specs: readonly BlockSpec<any>[]): BlockRegistry<B>`

`searchText` returns `string | null` — `null` means "nothing worth indexing", which is what the reference `blockText` returns for an image with no caption. Keeping the `null` makes the search index's filter explicit rather than dropping empty strings by accident.

- [ ] **Step 1: Write the failing test**

Create `src/blocks/registry.test.tsx`:

```tsx
import { describe, expect, it } from 'vitest';
import { createRegistry, defineBlock } from './registry';
import type { BlockBase } from '../content/types';

interface NoteBlock extends BlockBase {
  type: 'note';
  text: string;
}

const note = defineBlock<NoteBlock>({
  type: 'note',
  component: ({ block }) => <p className="note">{block.text}</p>,
  searchText: (block) => block.text,
  schema: { required: ['type', 'text'], properties: { type: { const: 'note' } } },
});

interface MarkBlock extends BlockBase {
  type: 'mark';
}

const mark = defineBlock<MarkBlock>({
  type: 'mark',
  component: () => <hr />,
  searchText: () => null,
  schema: { required: ['type'], properties: { type: { const: 'mark' } } },
});

describe('createRegistry', () => {
  it('looks a spec up by its type', () => {
    const registry = createRegistry([note, mark]);
    expect(registry.get('note')).toBe(note);
    expect(registry.has('mark')).toBe(true);
  });

  it('reports an unknown type as absent rather than throwing', () => {
    const registry = createRegistry([note]);
    expect(registry.get('nope')).toBeUndefined();
    expect(registry.has('nope')).toBe(false);
  });

  it('lists its types in registration order', () => {
    expect(createRegistry([note, mark]).types()).toEqual(['note', 'mark']);
  });

  it('rejects two specs claiming the same type', () => {
    expect(() => createRegistry([note, note])).toThrow(/note/);
  });

  it('rejects an empty registry, which would render every chapter blank', () => {
    expect(() => createRegistry([])).toThrow(/empty/i);
  });

  it('lets a later spec be swapped in explicitly, not silently', () => {
    const loud = defineBlock<NoteBlock>({ ...note, component: ({ block }) => <b>{block.text}</b> });
    expect(() => createRegistry([note, loud])).toThrow(/note/);
  });
});

describe('defineBlock', () => {
  it('returns its spec unchanged, existing only to infer T', () => {
    expect(note.type).toBe('note');
    expect(note.searchText({ type: 'note', text: 'hi' })).toBe('hi');
  });
});
```

Note the last registry test: overriding a built-in is **not** done by re-registering the same type. It is done by filtering `builtinBlocks` and adding your own — which Task 17's example app demonstrates. A silent last-wins override is how a consumer ends up not knowing which renderer they are getting.

- [ ] **Step 2: Run it to make sure it fails**

Run: `cd ~/Projects/manual && npx vitest run src/blocks/registry.test.tsx`
Expected: FAIL — `Failed to resolve import './registry'`.

- [ ] **Step 3: Write `src/blocks/registry.ts`**

```tsx
import type { ComponentType } from 'react';
import type { AnyBlock } from '../content/types';

/** Takes `section-id` or `chapter-id/section-id` and returns a route hash. */
export type AnchorResolver = (target: string) => string;

export interface BlockProps<T extends AnyBlock> {
  block: T;
  resolveAnchor: AnchorResolver;
}

/** A JSON Schema fragment. Not typed further — Ajv is the only consumer. */
export type JsonSchema = Record<string, unknown>;

/**
 * Everything the shell needs to know about one kind of block, in one place.
 *
 * In the reference implementation these three concerns lived in three
 * different files — a switch in `blocks/Block.tsx`, a switch in
 * `search/search.ts`, and a hand-maintained `oneOf` branch in
 * `content/schema.json` — and only the first was checked for exhaustiveness.
 * Adding a block type meant four edits, three of which the compiler could not
 * see. That asymmetry is how the cashier and courier manuals drifted apart.
 */
export interface BlockSpec<T extends AnyBlock> {
  type: T['type'];
  component: ComponentType<BlockProps<T>>;
  /** The block's searchable text, or `null` when it has none. */
  searchText: (block: T) => string | null;
  /** The `oneOf` branch that matches this block, and nothing else. */
  schema: JsonSchema;
}

/**
 * Identity at runtime; exists so `T` is inferred from the annotation rather
 * than widened from the object literal.
 */
export function defineBlock<T extends AnyBlock>(spec: BlockSpec<T>): BlockSpec<T> {
  return spec;
}

export interface BlockRegistry<B extends AnyBlock = AnyBlock> {
  get(type: string): BlockSpec<B> | undefined;
  has(type: string): boolean;
  types(): string[];
  specs(): readonly BlockSpec<B>[];
}

/**
 * `BlockSpec<any>` in the parameter is the one place type safety has to be
 * given up, and `any` is the only thing that works.
 *
 * `BlockSpec<T>` is **invariant** in `T`: it uses `T` covariantly through
 * `type: T['type']` and contravariantly through `component` and `searchText`.
 * So there is no concrete element type that accepts a list of specs for
 * *different* block types — not `AnyBlock` (fails on `component`, whose props
 * would have to accept any block), and not `never` either (fails on `type`,
 * since `'heading'` is not assignable to `never`).
 *
 * The erasure costs nothing where it matters: `defineBlock<T>` type-checks each
 * spec fully at its definition site, which is the only place a spec is written.
 * The registry beyond this point only reads `.type` and hands the spec back,
 * and the cast on the way out is sound because `get` is keyed by the same
 * `type` the spec declares.
 */
export function createRegistry<B extends AnyBlock = AnyBlock>(
  specs: readonly BlockSpec<any>[],
): BlockRegistry<B> {
  if (specs.length === 0) {
    throw new Error(
      'createRegistry: the registry is empty, so every chapter would render blank. ' +
        'Pass builtinBlocks, or your own specs.',
    );
  }

  const byType = new Map<string, BlockSpec<B>>();

  for (const spec of specs) {
    const typed = spec as BlockSpec<B>;
    if (byType.has(typed.type)) {
      throw new Error(
        `createRegistry: two specs both claim the block type "${typed.type}". ` +
          'To replace a built-in, filter it out of builtinBlocks rather than ' +
          'registering over it — a silent last-wins override hides which ' +
          'renderer you are getting.',
      );
    }
    byType.set(typed.type, typed);
  }

  const ordered = [...byType.values()];

  return {
    get: (type) => byType.get(type),
    has: (type) => byType.has(type),
    types: () => ordered.map((spec) => String(spec.type)),
    specs: () => ordered,
  };
}
```

- [ ] **Step 4: Run the tests**

Run: `cd ~/Projects/manual && npx vitest run src/blocks/registry.test.tsx && npm run typecheck`
Expected: PASS, 7 tests; typecheck clean.

- [ ] **Step 5: Commit**

```bash
cd ~/Projects/manual
git add src/blocks/registry.ts src/blocks/registry.test.tsx
git commit -m "feat: add the block registry

One spec per block type carries its component, its search extractor and its
schema fragment together, so the renderer and the schema cannot disagree.
Duplicate registration throws rather than last-wins: replacing a built-in
should be a visible act.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: Inline markup

**Files:**
- Create: `src/blocks/inline.tsx`
- Test: `src/blocks/inline.test.tsx`
- Reference: `~/Projects/evrika-cashier-desktop/manual/src/blocks/inline.tsx` (port verbatim)

**Interfaces:**
- Consumes: `AnchorResolver` from `src/blocks/registry.ts` (Task 3).
- Produces: `function inline(text: string, resolveAnchor: AnchorResolver): ReactNode`

- [ ] **Step 1: Write the failing test**

Create `src/blocks/inline.test.tsx`:

```tsx
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { inline } from './inline';

const resolve = (target: string) => `#/ru/${target.includes('/') ? target : `chapter/${target}`}`;

describe('inline', () => {
  it('renders plain text as plain text', () => {
    render(<p>{inline('просто текст', resolve)}</p>);
    expect(screen.getByText('просто текст')).toBeDefined();
  });

  it('renders **bold** as strong', () => {
    const { container } = render(<p>{inline('нажмите **Оплатить** сейчас', resolve)}</p>);
    expect(container.querySelector('strong')?.textContent).toBe('Оплатить');
    expect(container.textContent).toBe('нажмите Оплатить сейчас');
  });

  it('routes a same-chapter anchor through the resolver', () => {
    const { container } = render(<p>{inline('см. [оплату](#payment)', resolve)}</p>);
    const link = container.querySelector('a');
    expect(link?.getAttribute('href')).toBe('#/ru/chapter/payment');
    expect(link?.textContent).toBe('оплату');
  });

  it('routes a cross-chapter anchor through the resolver', () => {
    const { container } = render(<p>{inline('[возвраты](#refunds/partial)', resolve)}</p>);
    expect(container.querySelector('a')?.getAttribute('href')).toBe('#/ru/refunds/partial');
  });

  it('leaves raw HTML inert, because content is data', () => {
    const { container } = render(<p>{inline('<b>не тег</b>', resolve)}</p>);
    expect(container.querySelector('b')).toBeNull();
    expect(container.textContent).toBe('<b>не тег</b>');
  });

  it('handles several marks in one string', () => {
    const { container } = render(
      <p>{inline('**А** и [Б](#b) и **В**', resolve)}</p>,
    );
    expect(container.querySelectorAll('strong')).toHaveLength(2);
    expect(container.querySelectorAll('a')).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run it to make sure it fails**

Run: `cd ~/Projects/manual && npx vitest run src/blocks/inline.test.tsx`
Expected: FAIL — `Failed to resolve import './inline'`.

- [ ] **Step 3: Port the implementation**

Copy `~/Projects/evrika-cashier-desktop/manual/src/blocks/inline.tsx` to `src/blocks/inline.tsx`. Keep its doc comment in full — it is the normative statement of the content format, and the validator in Task 15 checks the same two forms.

Three changes:
1. Delete the local `export type AnchorResolver` and import it: `import type { AnchorResolver } from './registry';`. It now belongs to the registry, since it is part of `BlockProps`.
2. Adjust the comment's cross-reference from `src/app/route.ts` to the new path — the file is still `src/app/route.ts` (Task 13), so no change is needed. Verify rather than assume.
3. Narrow the capture groups, which `noUncheckedIndexedAccess` types as `string | undefined`
   where the reference repo did not. Both guards become truthiness checks, which is sound
   because both groups are `+`-quantified and so can never match an empty string:

   ```tsx
   const bold = /^\*\*([^*]+)\*\*$/.exec(part);
   if (bold?.[1]) return <strong key={index}>{bold[1]}</strong>;

   const link = /^\[([^\]]+)\]\(#([a-z0-9-]+(?:\/[a-z0-9-]+)?)\)$/.exec(part);
   if (link?.[1] && link[2]) {
     return (
       <a key={index} className="inline-link" href={resolveAnchor(link[2])}>
         {link[1]}
       </a>
     );
   }
   ```

- [ ] **Step 4: Run the tests**

Run: `cd ~/Projects/manual && npx vitest run src/blocks/inline.test.tsx && npm run typecheck`
Expected: PASS, 6 tests; typecheck clean.

- [ ] **Step 5: Commit**

```bash
cd ~/Projects/manual
git add src/blocks/inline.tsx src/blocks/inline.test.tsx
git commit -m "feat: port the inline markup renderer

Two forms only, **bold** and [label](#anchor), neither Markdown nor HTML:
a renderer that accepts arbitrary HTML is a renderer that has to be
trusted. AnchorResolver moves to the registry, where BlockProps needs it.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 5: UI strings

**Files:**
- Create: `src/app/strings.ts`
- Test: `src/app/strings.test.ts`
- Reference: `~/Projects/evrika-cashier-desktop/manual/src/app/ui.ts`

**Interfaces:**
- Consumes: `BuiltinLocale` from `src/content/builtins.ts` (Task 2).
- Produces:
  - `interface UiStrings` — the reference's eleven keys plus `mediaMissing`, twelve total
  - `const BUILTIN_STRINGS: Record<BuiltinLocale, UiStrings>`
  - `const UI_STRING_KEYS: readonly (keyof UiStrings)[]`

`UI_STRING_KEYS` exists so `resolveConfig` (Task 12) can name exactly which keys a consumer's locale is missing, instead of failing on the first one or rendering `undefined`.

- [ ] **Step 1: Write the failing test**

Create `src/app/strings.test.ts`:

```ts
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
```

- [ ] **Step 2: Run it to make sure it fails**

Run: `cd ~/Projects/manual && npx vitest run src/app/strings.test.ts`
Expected: FAIL — `Failed to resolve import './strings'`.

- [ ] **Step 3: Write `src/app/strings.ts`**

Port the eleven keys and both locales' values from the reference verbatim, keeping its doc comment about why the chrome lives apart from the content. Then add the twelfth key. `{src}` is a placeholder the media block interpolates — plain `String.replace`, no formatting library.

```ts
export interface UiStrings {
  languageGroup: string;
  searchPlaceholder: string;
  searchEmpty: string;
  searchHint: string;
  fallbackNotice: string;
  chapterMissing: string;
  onThisPage: string;
  nextChapter: string;
  previousChapter: string;
  openSections: string;
  closeSections: string;
  /** The missing-media placeholder. `{src}` is replaced with the named file. */
  mediaMissing: string;
}

export const UI_STRING_KEYS = [
  'languageGroup', 'searchPlaceholder', 'searchEmpty', 'searchHint',
  'fallbackNotice', 'chapterMissing', 'onThisPage', 'nextChapter',
  'previousChapter', 'openSections', 'closeSections', 'mediaMissing',
] as const satisfies readonly (keyof UiStrings)[];
```

New values for the twelfth key: `ru: 'Нет файла: {src}'`, `kk: 'Файл жоқ: {src}'`.

The `satisfies` clause is what makes the third test redundant at compile time as well as at runtime — leave both, since the runtime one also catches a key present in the array but absent from a locale's object.

- [ ] **Step 4: Run the tests**

Run: `cd ~/Projects/manual && npx vitest run src/app/strings.test.ts && npm run typecheck`
Expected: PASS, 5 tests; typecheck clean.

- [ ] **Step 5: Commit**

```bash
cd ~/Projects/manual
git add src/app/strings.ts src/app/strings.test.ts
git commit -m "feat: bundle ru/kk chrome strings, plus the media placeholder

Twelve keys: the reference implementation's eleven, and mediaMissing —
the missing-media placeholder hardcoded «Нет файла» in blocks/media.tsx,
which meant one line of the manual ignored the reader's locale.

Keeps both apps' guard against a Kazakh value that is the Russian pasted
over.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 6: The shell context

**Files:**
- Create: `src/app/context.tsx`
- Test: `src/app/context.test.tsx`

**Interfaces:**
- Consumes: `UiStrings` (Task 5).
- Produces:
  - `interface ManualContextValue { strings: UiStrings; resolveMedia: (src: string) => string | undefined }`
  - `const ManualProvider: ComponentType<{ value: ManualContextValue; children: ReactNode }>`
  - `function useManual(): ManualContextValue` — throws outside a provider
  - `function createMediaResolver(media: Record<string, string> | undefined): (src: string) => string | undefined` — one parameter only; matching on the `/media/` segment boundary is precisely what removes the need for a base path

Blocks need two ambient things: the reader's strings and a way to turn `media/kaspi-qr.svg` into a bundled URL. Threading both through `BlockProps` would put them in every custom block's signature whether it wants them or not, so they come from context. `resolveAnchor` stays a prop, because it is route-dependent and a block may be rendered outside a route (search snippets, tests).

- [ ] **Step 1: Write the failing test**

Create `src/app/context.test.tsx`:

```tsx
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ManualProvider, createMediaResolver, useManual } from './context';
import { BUILTIN_STRINGS } from './strings';

function Probe() {
  const { strings, resolveMedia } = useManual();
  return (
    <>
      <span data-testid="s">{strings.onThisPage}</span>
      <span data-testid="m">{resolveMedia('media/a.svg') ?? 'none'}</span>
    </>
  );
}

describe('useManual', () => {
  it('reads strings and the media resolver from the provider', () => {
    render(
      <ManualProvider value={{
        strings: BUILTIN_STRINGS.ru,
        resolveMedia: createMediaResolver({ '../content/media/a.svg': '/a-hash.svg' }),
      }}>
        <Probe />
      </ManualProvider>,
    );
    expect(screen.getByTestId('s').textContent).toBe('В этом разделе');
    expect(screen.getByTestId('m').textContent).toBe('/a-hash.svg');
  });

  it('throws outside a provider, rather than rendering a broken shell', () => {
    expect(() => render(<Probe />)).toThrow(/ManualProvider/);
  });
});

describe('createMediaResolver', () => {
  it('matches a glob key by its trailing content path', () => {
    const resolve = createMediaResolver({
      '../content/media/kaspi-qr.svg': '/assets/kaspi-qr-a1b2.svg',
      '../../content/media/other.png': '/assets/other-c3d4.png',
    });
    expect(resolve('media/kaspi-qr.svg')).toBe('/assets/kaspi-qr-a1b2.svg');
    expect(resolve('media/other.png')).toBe('/assets/other-c3d4.png');
  });

  it('returns undefined for a file nobody bundled', () => {
    expect(createMediaResolver({})('media/ghost.svg')).toBeUndefined();
    expect(createMediaResolver(undefined)('media/ghost.svg')).toBeUndefined();
  });

  it('does not match a path that merely ends with the same characters', () => {
    const resolve = createMediaResolver({ '../content/media/xqr.svg': '/x.svg' });
    expect(resolve('media/qr.svg')).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run it to make sure it fails**

Run: `cd ~/Projects/manual && npx vitest run src/app/context.test.tsx`
Expected: FAIL — `Failed to resolve import './context'`.

- [ ] **Step 3: Write `src/app/context.tsx`**

```tsx
import { createContext, useContext, type ReactNode } from 'react';
import type { UiStrings } from './strings';

export interface ManualContextValue {
  strings: UiStrings;
  resolveMedia: (src: string) => string | undefined;
}

const ManualContext = createContext<ManualContextValue | null>(null);

export function ManualProvider({
  value,
  children,
}: {
  value: ManualContextValue;
  children: ReactNode;
}) {
  return <ManualContext.Provider value={value}>{children}</ManualContext.Provider>;
}

export function useManual(): ManualContextValue {
  const value = useContext(ManualContext);
  if (!value) {
    throw new Error(
      'useManual: no ManualProvider above this component. Render <Manual> (or ' +
        'wrap your own layout in <ManualProvider>) — a shell without strings ' +
        'would render blank chrome, which is harder to diagnose than this.',
    );
  }
  return value;
}

/**
 * Turns the content path a chapter writes — `media/kaspi-qr.svg` — into the URL
 * the bundler produced.
 *
 * The keys of `config.media` are whatever `import.meta.glob` produced in the
 * *consumer's* file, so their prefix depends on where that file sits relative
 * to `content/` (`../content/media/…` from `src/main.tsx`, `../../content/…`
 * from a nested one). The library cannot know that prefix, so it matches on the
 * `media/` segment boundary instead of on a computed prefix — which is also why
 * a key ending in `xqr.svg` must not answer a request for `qr.svg`.
 */
export function createMediaResolver(
  media: Record<string, string> | undefined,
): (src: string) => string | undefined {
  if (!media) return () => undefined;

  const byContentPath = new Map<string, string>();
  for (const [key, url] of Object.entries(media)) {
    const at = key.lastIndexOf('/media/');
    if (at === -1) continue;
    byContentPath.set(key.slice(at + 1), url);
  }

  return (src) => byContentPath.get(src.replace(/^\.?\//, ''));
}
```

- [ ] **Step 4: Run the tests**

Run: `cd ~/Projects/manual && npx vitest run src/app/context.test.tsx && npm run typecheck`
Expected: PASS, 5 tests; typecheck clean.

- [ ] **Step 5: Commit**

```bash
cd ~/Projects/manual
git add src/app/context.tsx src/app/context.test.tsx
git commit -m "feat: add the shell context and the media resolver

Strings and media resolution are ambient, so they come from context rather
than from BlockProps — a custom block should not have to declare
parameters it does not use. The resolver matches on the /media/ segment
because the consumer's glob prefix depends on where their main.tsx sits,
which the library cannot know.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 7: Text and list blocks

**Files:**
- Create: `src/blocks/builtin/heading.tsx`, `paragraph.tsx`, `list.tsx`, `steps.tsx`
- Test: `src/blocks/builtin/text.test.tsx`
- Reference: `~/Projects/evrika-cashier-desktop/manual/src/blocks/text.tsx`, `lists.tsx`

**Interfaces:**
- Consumes: `defineBlock`, `BlockSpec` (Task 3); `inline` (Task 4); block interfaces (Task 2).
- Produces: `headingBlock`, `paragraphBlock`, `listBlock`, `stepsBlock` — one `BlockSpec` export each, named `<type>Block`.

One file per block type, each exporting exactly one spec. The reference grouped two per file; splitting them is what makes "where does `steps` live" answerable without reading anything.

- [ ] **Step 1: Write the failing test**

Create `src/blocks/builtin/text.test.tsx`:

```tsx
import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { headingBlock } from './heading';
import { paragraphBlock } from './paragraph';
import { listBlock } from './list';
import { stepsBlock } from './steps';

const resolve = (target: string) => `#/ru/c/${target}`;

describe('heading', () => {
  it('renders h2 or h3 by level, carrying the anchor id', () => {
    const { container } = render(
      <headingBlock.component
        block={{ type: 'heading', level: 2, id: 'payment', text: 'Оплата' }}
        resolveAnchor={resolve}
      />,
    );
    const h2 = container.querySelector('h2');
    expect(h2?.id).toBe('payment');
    expect(h2?.querySelector('a')?.getAttribute('href')).toBe('#/ru/c/payment');
  });

  it('renders level 3 as h3', () => {
    const { container } = render(
      <headingBlock.component
        block={{ type: 'heading', level: 3, id: 'qr', text: 'QR' }}
        resolveAnchor={resolve}
      />,
    );
    expect(container.querySelector('h3')).not.toBeNull();
  });

  it('indexes its text and outranks body copy by carrying the title', () => {
    expect(headingBlock.searchText({ type: 'heading', level: 2, id: 'a', text: 'Оплата' }))
      .toBe('Оплата');
  });
});

describe('paragraph', () => {
  it('renders inline markup', () => {
    const { container } = render(
      <paragraphBlock.component
        block={{ type: 'paragraph', text: 'нажмите **Оплатить**' }}
        resolveAnchor={resolve}
      />,
    );
    expect(container.querySelector('strong')?.textContent).toBe('Оплатить');
  });

  it('indexes its text', () => {
    expect(paragraphBlock.searchText({ type: 'paragraph', text: 'текст' })).toBe('текст');
  });
});

describe('list', () => {
  it('renders ul by default and ol when ordered', () => {
    const items = ['раз', 'два'];
    const { container: bulleted } = render(
      <listBlock.component block={{ type: 'list', items }} resolveAnchor={resolve} />,
    );
    expect(bulleted.querySelector('ul')).not.toBeNull();
    expect(bulleted.querySelectorAll('li')).toHaveLength(2);

    const { container: ordered } = render(
      <listBlock.component
        block={{ type: 'list', ordered: true, items }}
        resolveAnchor={resolve}
      />,
    );
    expect(ordered.querySelector('ol')).not.toBeNull();
  });

  it('indexes its items as one string', () => {
    expect(listBlock.searchText({ type: 'list', items: ['раз', 'два'] })).toBe('раз два');
  });
});

describe('steps', () => {
  it('numbers each step', () => {
    const { container } = render(
      <stepsBlock.component
        block={{ type: 'steps', items: ['первый', 'второй', 'третий'] }}
        resolveAnchor={resolve}
      />,
    );
    expect([...container.querySelectorAll('.steps-number')].map((n) => n.textContent))
      .toEqual(['1', '2', '3']);
  });

  it('indexes its items as one string', () => {
    expect(stepsBlock.searchText({ type: 'steps', items: ['раз', 'два'] })).toBe('раз два');
  });
});

describe('schemas', () => {
  it('each names its own type and nothing else', () => {
    for (const spec of [headingBlock, paragraphBlock, listBlock, stepsBlock]) {
      // One matcher rather than three reads plus a cast: `schema` is
      // `Record<string, unknown>` by design, since the library does not model
      // JSON Schema, and `toMatchObject` asserts into it without pretending to
      // know its shape.
      expect(spec.schema, spec.type).toMatchObject({
        additionalProperties: false,
        required: expect.arrayContaining(['type']),
        properties: { type: { const: spec.type } },
      });
    }
  });
});
```

- [ ] **Step 2: Run it to make sure it fails**

Run: `cd ~/Projects/manual && npx vitest run src/blocks/builtin/text.test.tsx`
Expected: FAIL — `Failed to resolve import './heading'`.

- [ ] **Step 3: Write the four specs**

Each file is: the component ported verbatim from the reference (keeping its comments — the heading one explains why `id` is rendered onto the element rather than derived from the text), plus the spec. `src/blocks/builtin/heading.tsx`:

```tsx
import type { HeadingBlock } from '../../content/types';
import { defineBlock, type BlockProps } from '../registry';
import { inline } from '../inline';

/**
 * The heading's `id` is the anchor every deep link and search hit points at, so
 * it is rendered onto the element itself and never derived from the text.
 */
function Heading({ block, resolveAnchor }: BlockProps<HeadingBlock>) {
  const Tag = block.level === 2 ? 'h2' : 'h3';

  return (
    <Tag id={block.id} className={`heading heading-${block.level}`}>
      <a className="heading-anchor" href={resolveAnchor(block.id)}>
        {inline(block.text, resolveAnchor)}
      </a>
    </Tag>
  );
}

export const headingBlock = defineBlock<HeadingBlock>({
  type: 'heading',
  component: Heading,
  searchText: (block) => block.text,
  schema: {
    required: ['type', 'level', 'id', 'text'],
    additionalProperties: false,
    properties: {
      type: { const: 'heading' },
      level: { type: 'integer', enum: [2, 3] },
      id: { $ref: '#/definitions/anchor' },
      text: { $ref: '#/definitions/nonEmptyText' },
    },
  },
});
```

The `$ref`s point at definitions the generated schema supplies at its root (Task 20): `anchor` is `{ type: 'string', pattern: '^[a-z0-9-]+$' }`, `nonEmptyText` is `{ type: 'string', minLength: 1 }`, `stringList` is a non-empty array of `nonEmptyText`. Copy each fragment's exact shape from `~/Projects/evrika-cashier-desktop/manual/content/schema.json` — it already has a correct `oneOf` branch per type; this task is redistributing them, not rewriting them.

`paragraph.tsx`, `list.tsx`, `steps.tsx` follow the same shape. Their `searchText`: paragraph returns `block.text`; list and steps return `block.items.join(' ')`. Keep the reference's comment on `Steps` explaining why it is not `list` with `ordered: true`.

- [ ] **Step 4: Run the tests**

Run: `cd ~/Projects/manual && npx vitest run src/blocks/builtin/text.test.tsx && npm run typecheck`
Expected: PASS, 10 tests; typecheck clean.

- [ ] **Step 5: Commit**

```bash
cd ~/Projects/manual
git add src/blocks/builtin src/blocks/builtin/text.test.tsx
git commit -m "feat: add heading, paragraph, list and steps specs

One block type per file, each carrying its component, search extractor and
schema branch together. The schema branches are the existing
content/schema.json redistributed, not rewritten.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 8: Callout, keys and table blocks

**Files:**
- Create: `src/blocks/builtin/callout.tsx`, `keys.tsx`, `table.tsx`
- Test: `src/blocks/builtin/notices.test.tsx`
- Reference: `~/Projects/evrika-cashier-desktop/manual/src/blocks/notices.tsx`, `table.tsx`

**Interfaces:**
- Consumes: `defineBlock`, `BlockProps` (Task 3); `inline` (Task 4); `CalloutBlock`, `KeysBlock`, `TableBlock` (Task 2).
- Produces: `calloutBlock`, `keysBlock`, `tableBlock`.

- [ ] **Step 1: Write the failing test**

Create `src/blocks/builtin/notices.test.tsx`:

```tsx
import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { calloutBlock } from './callout';
import { keysBlock } from './keys';
import { tableBlock } from './table';

const resolve = (target: string) => `#/ru/c/${target}`;

describe('callout', () => {
  it('carries its variant into the class name', () => {
    for (const variant of ['info', 'warning', 'danger', 'success'] as const) {
      const { container } = render(
        <calloutBlock.component
          block={{ type: 'callout', variant, text: 'внимание' }}
          resolveAnchor={resolve}
        />,
      );
      expect(container.querySelector(`.callout-${variant}`), variant).not.toBeNull();
    }
  });

  it('renders inline markup in its text', () => {
    const { container } = render(
      <calloutBlock.component
        block={{ type: 'callout', variant: 'warning', text: 'см. [оплату](#pay)' }}
        resolveAnchor={resolve}
      />,
    );
    expect(container.querySelector('a')?.getAttribute('href')).toBe('#/ru/c/pay');
  });

  it('indexes its text', () => {
    expect(calloutBlock.searchText({ type: 'callout', variant: 'info', text: 'т' })).toBe('т');
  });
});

describe('keys', () => {
  it('renders each key as a kbd joined by a separator', () => {
    const { container } = render(
      <keysBlock.component
        block={{ type: 'keys', combo: ['Ctrl', 'Shift', 'P'], text: 'открыть' }}
        resolveAnchor={resolve}
      />,
    );
    expect([...container.querySelectorAll('kbd')].map((k) => k.textContent))
      .toEqual(['Ctrl', 'Shift', 'P']);
    expect(container.querySelectorAll('.keys-plus')).toHaveLength(2);
  });

  it('renders a single key without a separator', () => {
    const { container } = render(
      <keysBlock.component
        block={{ type: 'keys', combo: ['F9'], text: 'оплата' }}
        resolveAnchor={resolve}
      />,
    );
    expect(container.querySelectorAll('.keys-plus')).toHaveLength(0);
  });

  it('indexes the combo and its description together', () => {
    expect(keysBlock.searchText({ type: 'keys', combo: ['Ctrl', 'P'], text: 'печать' }))
      .toBe('Ctrl + P печать');
  });
});

describe('table', () => {
  it('renders headers and rows', () => {
    const { container } = render(
      <tableBlock.component
        block={{ type: 'table', headers: ['Код', 'Что значит'], rows: [['1', 'ок'], ['2', 'нет']] }}
        resolveAnchor={resolve}
      />,
    );
    expect(container.querySelectorAll('th')).toHaveLength(2);
    expect(container.querySelectorAll('tbody tr')).toHaveLength(2);
    expect(container.querySelectorAll('td')).toHaveLength(4);
  });

  it('indexes headers and every cell', () => {
    expect(tableBlock.searchText({
      type: 'table', headers: ['Код'], rows: [['1'], ['2']],
    })).toBe('Код 1 2');
  });
});
```

- [ ] **Step 2: Run it to make sure it fails**

Run: `cd ~/Projects/manual && npx vitest run src/blocks/builtin/notices.test.tsx`
Expected: FAIL — `Failed to resolve import './callout'`.

- [ ] **Step 3: Write the three specs**

Port `Callout` and `Keys` from the cashier `notices.tsx` and `Table` from `table.tsx`, each into its own file with its spec appended, in the shape Task 7 established.

`Callout` renders `` `callout callout-${block.variant}` `` — **`callout`, not `notice`**. The two
are different things and the stylesheet treats them as such: `.callout` is authored content and
has all four variants, while `.notice` is the shell's own message chrome and exists only as
`.notice-info` and `.notice-warning` (the fallback and chapter-missing messages in
`ChapterView`). Rendering a callout as `.notice-danger` or `.notice-success` would silently drop
it to the base teal styling, because those two rules do not exist. `searchText` implementations:

- callout: `(block) => block.text`
- keys: `(block) => \`${block.combo.join(' + ')} ${block.text}\`` — matches the cashier `search.ts` exactly, so `Ctrl + P` is findable as typed
- table: `(block) => [...block.headers, ...block.rows.flat()].join(' ')`

Schema branches: copy from the cashier `content/schema.json`. `keys` requires `type`, `combo`, `text` with `combo` as a `stringList`; `table` requires `type`, `headers`, `rows` with `rows` an array of `stringList`; `callout` requires `type`, `variant`, `text` with `variant` an enum of the four.

- [ ] **Step 4: Run the tests**

Run: `cd ~/Projects/manual && npx vitest run src/blocks/builtin/notices.test.tsx && npm run typecheck`
Expected: PASS, 8 tests; typecheck clean.

- [ ] **Step 5: Commit**

```bash
cd ~/Projects/manual
git add src/blocks/builtin
git commit -m "feat: add callout, keys and table specs

keys ships in the library even though the courier manual does not author it:
an unused block type costs a consumer nothing, and shipping it is what puts
both existing manuals on identical code.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 9: Image and video blocks

**Files:**
- Create: `src/blocks/builtin/image.tsx`, `video.tsx`, `src/blocks/builtin/MissingMedia.tsx`
- Test: `src/blocks/builtin/media.test.tsx`
- Reference: `~/Projects/evrika-cashier-desktop/manual/src/blocks/media.tsx`

**Interfaces:**
- Consumes: `useManual` (Task 6); `defineBlock` (Task 3); `ImageBlock`, `VideoBlock` (Task 2).
- Produces: `imageBlock`, `videoBlock`.

This is where the second glob inversion lands. The reference resolves media through a module-level `import.meta.glob`; here it comes from `useManual().resolveMedia`.

- [ ] **Step 1: Write the failing test**

Create `src/blocks/builtin/media.test.tsx`:

```tsx
import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import type { ReactNode } from 'react';
import { imageBlock } from './image';
import { videoBlock } from './video';
import { ManualProvider, createMediaResolver } from '../../app/context';
import { BUILTIN_STRINGS } from '../../app/strings';

const resolve = (target: string) => `#/ru/c/${target}`;

function withMedia(children: ReactNode, media: Record<string, string> = {}) {
  return render(
    <ManualProvider value={{
      strings: BUILTIN_STRINGS.ru,
      resolveMedia: createMediaResolver(media),
    }}>
      {children}
    </ManualProvider>,
  );
}

const BUNDLED = { '../content/media/qr.svg': '/assets/qr-a1b2.svg' };

describe('image', () => {
  it('renders the bundled URL for a named file', () => {
    const { container } = withMedia(
      <imageBlock.component
        block={{ type: 'image', src: 'media/qr.svg', alt: 'QR' }}
        resolveAnchor={resolve}
      />,
      BUNDLED,
    );
    const img = container.querySelector('img');
    expect(img?.getAttribute('src')).toBe('/assets/qr-a1b2.svg');
    expect(img?.getAttribute('alt')).toBe('QR');
    expect(img?.getAttribute('loading')).toBe('lazy');
  });

  it('renders a caption when there is one, and no figcaption when there is not', () => {
    const { container: captioned } = withMedia(
      <imageBlock.component
        block={{ type: 'image', src: 'media/qr.svg', alt: 'QR', caption: 'Экран QR' }}
        resolveAnchor={resolve}
      />,
      BUNDLED,
    );
    expect(captioned.querySelector('figcaption')?.textContent).toBe('Экран QR');

    const { container: bare } = withMedia(
      <imageBlock.component
        block={{ type: 'image', src: 'media/qr.svg', alt: 'QR' }}
        resolveAnchor={resolve}
      />,
      BUNDLED,
    );
    expect(bare.querySelector('figcaption')).toBeNull();
  });

  it('labels a gap, in the reader locale, when the file is not bundled', () => {
    const { container } = withMedia(
      <imageBlock.component
        block={{ type: 'image', src: 'media/ghost.svg', alt: 'нет' }}
        resolveAnchor={resolve}
      />,
    );
    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('.figure-missing')?.textContent)
      .toBe('Нет файла: media/ghost.svg');
  });

  it('indexes its caption, and nothing when it has none', () => {
    expect(imageBlock.searchText({ type: 'image', src: 'a', alt: 'b', caption: 'Экран' }))
      .toBe('Экран');
    expect(imageBlock.searchText({ type: 'image', src: 'a', alt: 'b' })).toBeNull();
  });
});

describe('video', () => {
  it('renders the bundled URL and resolves the poster too', () => {
    const { container } = withMedia(
      <videoBlock.component
        block={{ type: 'video', src: 'media/clip.mp4', poster: 'media/qr.svg' }}
        resolveAnchor={resolve}
      />,
      { ...BUNDLED, '../content/media/clip.mp4': '/assets/clip-c3.mp4' },
    );
    const video = container.querySelector('video');
    expect(video?.getAttribute('src')).toBe('/assets/clip-c3.mp4');
    expect(video?.getAttribute('poster')).toBe('/assets/qr-a1b2.svg');
  });

  it('labels a gap when the clip is not bundled', () => {
    const { container } = withMedia(
      <videoBlock.component
        block={{ type: 'video', src: 'media/ghost.mp4' }}
        resolveAnchor={resolve}
      />,
    );
    expect(container.querySelector('.figure-missing')).not.toBeNull();
  });

  it('indexes its caption, and nothing when it has none', () => {
    expect(videoBlock.searchText({ type: 'video', src: 'a', caption: 'Видео' })).toBe('Видео');
    expect(videoBlock.searchText({ type: 'video', src: 'a' })).toBeNull();
  });
});
```

- [ ] **Step 2: Run it to make sure it fails**

Run: `cd ~/Projects/manual && npx vitest run src/blocks/builtin/media.test.tsx`
Expected: FAIL — `Failed to resolve import './image'`.

- [ ] **Step 3: Write `src/blocks/builtin/MissingMedia.tsx`**

```tsx
import { useManual } from '../../app/context';

/**
 * A named file that is not in the bundle renders as a labelled gap rather than
 * a broken image: a manual ships with placeholder media and real screenshots
 * land later by filename, so this state is expected during authoring.
 *
 * The label used to be the hardcoded Russian «Нет файла» — one line of the
 * manual that ignored the reader's locale. It is a UI string now.
 */
export function MissingMedia({ src }: { src: string }) {
  const { strings } = useManual();

  return (
    <div className="figure figure-missing">
      <span className="figure-missing-label">
        {strings.mediaMissing.replace('{src}', src)}
      </span>
    </div>
  );
}
```

- [ ] **Step 4: Write `image.tsx` and `video.tsx`**

Port `Image` and `Video` from the reference. Replace the module-level glob and `resolveMedia` helper with `const { resolveMedia } = useManual();` inside each component. Keep the reference's comment about media resolving through Vite's asset pipeline, amended to say the glob now runs in the consumer's `main.tsx` and arrives as `config.media`.

`searchText` for both: `(block) => block.caption ?? null`.

Schema branches: copy from the reference `content/schema.json`. `image` requires `type`, `src`, `alt`; `video` requires `type`, `src`; both allow optional `caption`, and `video` an optional `poster`.

- [ ] **Step 5: Run the tests**

Run: `cd ~/Projects/manual && npx vitest run src/blocks/builtin/media.test.tsx && npm run typecheck`
Expected: PASS, 7 tests; typecheck clean.

- [ ] **Step 6: Commit**

```bash
cd ~/Projects/manual
git add src/blocks/builtin
git commit -m "feat: add image and video specs, reading media from context

The reference resolves media through a module-level import.meta.glob, which
from inside node_modules would glob the package rather than the app. It comes
from config.media through the shell context instead. The missing-media
placeholder now follows the reader's locale.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 10: The built-in set and the block renderer

**Files:**
- Create: `src/blocks/builtin/index.ts`, `src/blocks/BlockList.tsx`
- Test: `src/blocks/BlockList.test.tsx`
- Reference: `~/Projects/evrika-cashier-desktop/manual/src/blocks/Block.tsx`

**Interfaces:**
- Consumes: all nine specs (Tasks 7–9); `BlockRegistry`, `AnchorResolver` (Task 3).
- Produces:
  - `const builtinBlocks: readonly BlockSpec<any>[]` — the nine, in render-vocabulary order
  - `const defaultRegistry: BlockRegistry<BuiltinBlock>`
  - `function BlockList<B extends AnyBlock>(props: { blocks: B[]; registry: BlockRegistry<B>; resolveAnchor: AnchorResolver }): JSX.Element`

`BlockList` replaces the reference's `Block` switch. The exhaustive `never` default goes away with the union, so its job — making an unrendered block type loud — passes to the registry miss path and to `manual-kit validate`.

- [ ] **Step 1: Write the failing test**

Create `src/blocks/BlockList.test.tsx`:

```tsx
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import type { ReactNode } from 'react';
import { BlockList } from './BlockList';
import { builtinBlocks, defaultRegistry } from './builtin';
import { createRegistry, defineBlock } from './registry';
import { ManualProvider, createMediaResolver } from '../app/context';
import { BUILTIN_STRINGS } from '../app/strings';
import type { BlockBase, BuiltinBlock } from '../content/types';

const resolve = (target: string) => `#/ru/c/${target}`;

function withShell(children: ReactNode) {
  return render(
    <ManualProvider value={{
      strings: BUILTIN_STRINGS.ru,
      resolveMedia: createMediaResolver({}),
    }}>
      {children}
    </ManualProvider>,
  );
}

afterEach(() => vi.restoreAllMocks());

describe('builtinBlocks', () => {
  it('ships all nine types', () => {
    expect(defaultRegistry.types().sort()).toEqual([
      'callout', 'heading', 'image', 'keys', 'list',
      'paragraph', 'steps', 'table', 'video',
    ]);
  });

  it('gives every spec all three concerns', () => {
    for (const spec of builtinBlocks) {
      expect(typeof spec.component, spec.type).toBe('function');
      expect(typeof spec.searchText, spec.type).toBe('function');
      expect(spec.schema, spec.type).toBeTypeOf('object');
    }
  });
});

describe('BlockList', () => {
  it('renders each block through its registered component, in order', () => {
    const blocks: BuiltinBlock[] = [
      { type: 'heading', level: 2, id: 'a', text: 'Раз' },
      { type: 'paragraph', text: 'Два' },
      { type: 'list', items: ['Три'] },
    ];
    const { container } = withShell(
      <BlockList blocks={blocks} registry={defaultRegistry} resolveAnchor={resolve} />,
    );
    expect(container.querySelector('h2')?.textContent).toBe('Раз');
    expect(container.querySelector('.paragraph')?.textContent).toBe('Два');
    expect(container.querySelector('.list')?.textContent).toBe('Три');
  });

  it('renders a registered custom block', () => {
    interface NoteBlock extends BlockBase { type: 'note'; text: string }
    const noteBlock = defineBlock<NoteBlock>({
      type: 'note',
      component: ({ block }) => <aside className="note">{block.text}</aside>,
      searchText: (block) => block.text,
      schema: { required: ['type', 'text'], properties: { type: { const: 'note' } } },
    });
    const registry = createRegistry<BuiltinBlock | NoteBlock>([
      ...builtinBlocks, noteBlock,
    ]);
    const { container } = withShell(
      <BlockList
        blocks={[{ type: 'note', text: 'своё' }]}
        registry={registry}
        resolveAnchor={resolve}
      />,
    );
    expect(container.querySelector('.note')?.textContent).toBe('своё');
  });

  it('skips an unregistered type and warns, rather than crashing the chapter', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { container } = withShell(
      <BlockList
        blocks={[{ type: 'paragraph', text: 'виден' }, { type: 'nope' } as never]}
        registry={defaultRegistry}
        resolveAnchor={resolve}
      />,
    );
    expect(container.textContent).toContain('виден');
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('nope'));
  });

  it('keys by anchor id when present and by index otherwise', () => {
    // Annotated rather than inline: an inline array literal widens to a
    // structural type, and `B` would then be inferred from `blocks` instead of
    // agreeing with `defaultRegistry`.
    const mixed: BuiltinBlock[] = [
      { type: 'paragraph', text: 'а' },
      { type: 'paragraph', id: 'b', text: 'б' },
    ];
    const { container } = withShell(
      <BlockList blocks={mixed} registry={defaultRegistry} resolveAnchor={resolve} />,
    );
    expect(container.querySelectorAll('.paragraph')).toHaveLength(2);
  });
});
```

- [ ] **Step 2: Run it to make sure it fails**

Run: `cd ~/Projects/manual && npx vitest run src/blocks/BlockList.test.tsx`
Expected: FAIL — `Failed to resolve import './BlockList'`.

- [ ] **Step 3: Write `src/blocks/builtin/index.ts`**

```ts
import { createRegistry, type BlockSpec } from '../registry';
import type { BuiltinBlock } from '../../content/types';
import { headingBlock } from './heading';
import { paragraphBlock } from './paragraph';
import { listBlock } from './list';
import { stepsBlock } from './steps';
import { imageBlock } from './image';
import { videoBlock } from './video';
import { calloutBlock } from './callout';
import { tableBlock } from './table';
import { keysBlock } from './keys';

/**
 * The block vocabulary both existing manuals share, `keys` included — the
 * courier manual never authors it, and an unused spec costs it nothing.
 *
 * To replace one, filter it out and add your own; `createRegistry` rejects two
 * specs claiming the same type on purpose.
 */
export const builtinBlocks: readonly BlockSpec<any>[] = [
  headingBlock, paragraphBlock, listBlock, stepsBlock,
  imageBlock, videoBlock, calloutBlock, tableBlock, keysBlock,
];

export const defaultRegistry = createRegistry<BuiltinBlock>(builtinBlocks);

export {
  headingBlock, paragraphBlock, listBlock, stepsBlock,
  imageBlock, videoBlock, calloutBlock, tableBlock, keysBlock,
};
```

- [ ] **Step 4: Write `src/blocks/BlockList.tsx`**

```tsx
import type { AnyBlock } from '../content/types';
import type { AnchorResolver, BlockRegistry } from './registry';

/**
 * The one place a block turns into a component.
 *
 * The reference implementation was a `switch` over a closed union whose
 * `never` default made the compiler reject an unrendered block type. That
 * check cannot survive an open vocabulary — so the guarantee moves to
 * `manual-kit validate`, which fails a build whose content names a type the
 * registry does not have.
 *
 * If one reaches here anyway the chapter still renders: a reader who came for
 * chapter 9 is better served by the other thirty blocks than by a blank page,
 * and the warning is for whoever is authoring.
 */
export function BlockList<B extends AnyBlock>({
  blocks,
  registry,
  resolveAnchor,
}: {
  blocks: B[];
  registry: BlockRegistry<B>;
  resolveAnchor: AnchorResolver;
}) {
  return (
    <>
      {blocks.map((block, index) => {
        const spec = registry.get(block.type);

        if (!spec) {
          console.warn(
            `manual-kit: no block spec registered for type "${block.type}" — ` +
              'skipping it. Register a spec, or run `manual-kit validate` to ' +
              'find every occurrence.',
          );
          return null;
        }

        const Component = spec.component;
        return (
          <Component
            key={block.id ?? index}
            block={block}
            resolveAnchor={resolveAnchor}
          />
        );
      })}
    </>
  );
}
```

- [ ] **Step 5: Run the tests**

Run: `cd ~/Projects/manual && npx vitest run src/blocks && npm run typecheck`
Expected: PASS, all block suites green; typecheck clean.

- [ ] **Step 6: Commit**

```bash
cd ~/Projects/manual
git add src/blocks/builtin/index.ts src/blocks/BlockList.tsx src/blocks/BlockList.test.tsx
git commit -m "feat: assemble the built-in set and the registry-driven renderer

The switch and its never-default are gone with the closed union; an
unregistered type now warns and skips so the rest of the chapter survives,
and manual-kit validate is what makes it a build failure.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 11: Content source

**Files:**
- Create: `src/content/source.ts`
- Test: `src/content/source.test.ts`
- Reference: `~/Projects/evrika-cashier-desktop/manual/src/content/loader.ts`

**Interfaces:**
- Consumes: `Chapter`, `Manifest`, `AnyBlock` (Task 2).
- Produces:
  - `interface LoadedChapter<L, B> { chapter: Chapter<B>; locale: L; isFallback: boolean }`
  - `interface ContentSource<L extends string, B extends AnyBlock>` with `manifest: Manifest<L>`, `chapterList(): ManifestChapter[]`, `loadRawChapter(locale: L, id: string): Chapter<B> | null`, `loadChapter(locale: L, id: string): LoadedChapter<L, B> | null`, `tableOfContents(locale: L): Array<{ id: string; title: string }>`, `allChapters(locale: L): Chapter<B>[]`
  - `function createContentSource<L extends string, B extends AnyBlock>(manifest: Manifest<L>, modules: Record<string, { default: Chapter<B> }>, options: { fallback: L }): ContentSource<L, B>`

The reference is module-level singletons over its own glob. This is a factory over a passed-in record — which is what lets tests and the example app hold several manuals in one process, and is forced anyway by the glob inversion.

- [ ] **Step 1: Write the failing test**

Create `src/content/source.test.ts`:

```ts
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
```

- [ ] **Step 2: Run it to make sure it fails**

Run: `cd ~/Projects/manual && npx vitest run src/content/source.test.ts`
Expected: FAIL — `Failed to resolve import './source'`.

- [ ] **Step 3: Write `src/content/source.ts`**

Keep the reference's doc comments about the eager glob and the `file://` origin, moved to describe the `modules` parameter. The key difference from the reference: matching a module key cannot use a fixed `../../content/` prefix, for the reason given in Task 6 — match on the trailing `<locale>/<file>` instead.

```ts
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
```

- [ ] **Step 4: Run the tests**

Run: `cd ~/Projects/manual && npx vitest run src/content/source.test.ts && npm run typecheck`
Expected: PASS, 12 tests; typecheck clean.

- [ ] **Step 5: Commit**

```bash
cd ~/Projects/manual
git add src/content/source.ts src/content/source.test.ts
git commit -m "feat: turn the chapter loader into a content source factory

Module-level singletons over a local glob become a factory over a passed-in
record — forced by the glob inversion, and useful anyway: two manuals can
now exist in one process, which is what the tests and the example app need.

Russian-fallback-with-a-notice carries over unchanged.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 12: Config resolution

**Files:**
- Create: `src/config.ts`
- Test: `src/config.test.ts`

**Interfaces:**
- Consumes: `Manifest`, `Chapter`, `AnyBlock`, `isLocaleOf` (Task 2); `BUILTIN_LOCALE_LABELS`, `BuiltinLocale` (Task 2); `UiStrings`, `BUILTIN_STRINGS`, `UI_STRING_KEYS` (Task 5); `BlockRegistry`, `defaultRegistry` (Tasks 3, 10); `createContentSource` (Task 11); `createMediaResolver` (Task 6).
- Produces:
  - `interface ManualConfig<L, B>` — exactly as in the spec
  - `interface Slots<L>`
  - `interface RouteContext<L>` = `{ locale: L; chapterId: string; sectionId?: string }` re-exported from `src/app/route.ts` in Task 13; for this task define it locally in `src/app/route-types.ts` so both can import it without a cycle
  - `interface ResolvedConfig<L, B>` with `root`, `brand`, `locales: { list: readonly L[]; fallback: L; labels: Record<L, string>; strings: Record<L, UiStrings> }`, `registry`, `content`, `resolveMedia`, `colorScheme`, `search: { enabled: boolean; minQueryLength: number; maxResults: number }`, `routing`, `documentTitle`, `slots`
  - `function resolveConfig<L extends string, B extends AnyBlock>(config: ManualConfig<L, B>): ResolvedConfig<L, B>`

`resolveConfig` is pure and DOM-free apart from carrying `root` through. It is the only place bad config is rejected, and it must reject loudly at startup — a manual that renders blank chrome is far harder to diagnose than a thrown message.

- [ ] **Step 1: Write the failing test**

Create `src/config.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
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
```

- [ ] **Step 2: Run it to make sure it fails**

Run: `cd ~/Projects/manual && npx vitest run src/config.test.ts`
Expected: FAIL — `Failed to resolve import './config'`.

- [ ] **Step 3: Write `src/app/route-types.ts`**

```ts
/** Where the reader is. Defined apart from `route.ts` so `config.ts` can name
 *  it without importing the hash-routing machinery. */
export interface RouteContext<L extends string = string> {
  locale: L;
  chapterId: string;
  sectionId?: string;
}
```

- [ ] **Step 4: Write `src/config.ts`**

```ts
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
  documentTitle: (ctx: RouteContext<L>) => string;
  slots: Slots<L>;
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
```

- [ ] **Step 5: Run the tests**

Run: `cd ~/Projects/manual && npx vitest run src/config.test.ts && npm run typecheck`
Expected: PASS, 19 tests; typecheck clean.

- [ ] **Step 6: Commit**

```bash
cd ~/Projects/manual
git add src/config.ts src/config.test.ts src/app/route-types.ts
git commit -m "feat: resolve and validate manual config in one pure function

Every default and every startup rejection in one place. It throws rather
than warning: silently blank Kazakh chrome gets chased through the content
instead of through the one config line that caused it, so the error names
the locale and every missing key.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 13: Routing

**Files:**
- Create: `src/app/route.ts`, `src/app/useRoute.ts`
- Test: `src/app/route.test.ts`, `src/app/useRoute.test.ts`
- Reference: `~/Projects/evrika-cashier-desktop/manual/src/app/route.ts`, `useRoute.ts`

**Interfaces:**
- Consumes: `RouteContext` (Task 12); `isLocaleOf` (Task 2); `ResolvedConfig` (Task 12).
- Produces:
  - `type Route<L extends string> = RouteContext<L>` (alias, re-exported)
  - `function routeHref<L extends string>(route: Route<L>): string`
  - `function anchorResolver<L extends string>(route: Route<L>): AnchorResolver`
  - `function parseHash<L extends string>(hash: string, options: { locales: readonly L[]; fallback: L; defaultChapterId: string }): Route<L>`
  - `function useRoute<L, B>(config: ResolvedConfig<L, B>): { route: Route<L>; navigate: (next: Route<L>) => void; setLocale: (locale: L) => void }`

Two changes from the reference. `parseHash` takes the locale list and fallback instead of reading module constants. `useRoute` honours `config.routing`: `'memory'` keeps the route in state and never touches `window.location`, which is what makes the shell testable and embeddable where the URL is not ours.

The `localStorage` key becomes `manual-kit:locale:<brand-slug>` rather than the reference's shared `evrika-manual-locale`, so two manuals open in one browser do not fight over the remembered language.

- [ ] **Step 1: Write the failing test for `route.ts`**

Create `src/app/route.test.ts`. Port all of the reference's cases, then add the ones the parameterisation makes possible:

```ts
import { describe, expect, it } from 'vitest';
import { anchorResolver, parseHash, routeHref } from './route';

const options = { locales: ['ru', 'kk'] as const, fallback: 'ru' as const, defaultChapterId: 'start' };

describe('routeHref', () => {
  it('writes locale and chapter', () => {
    expect(routeHref({ locale: 'ru', chapterId: 'payment' })).toBe('#/ru/payment');
  });

  it('appends a section when there is one', () => {
    expect(routeHref({ locale: 'kk', chapterId: 'payment', sectionId: 'qr' }))
      .toBe('#/kk/payment/qr');
  });
});

describe('parseHash', () => {
  it('reads a full hash', () => {
    expect(parseHash('#/kk/payment/qr', options))
      .toEqual({ locale: 'kk', chapterId: 'payment', sectionId: 'qr' });
  });

  it('defaults an empty hash to the fallback locale and first chapter', () => {
    expect(parseHash('', options))
      .toEqual({ locale: 'ru', chapterId: 'start', sectionId: undefined });
  });

  it('falls back on an undeclared locale rather than routing to nothing', () => {
    expect(parseHash('#/de/payment', options).locale).toBe('ru');
  });

  it('tolerates a missing leading slash and doubled slashes', () => {
    expect(parseHash('#kk//payment', options))
      .toEqual({ locale: 'kk', chapterId: 'payment', sectionId: undefined });
  });

  it('uses the locale list it is given, not a library constant', () => {
    const en = { locales: ['en', 'fr'] as const, fallback: 'en' as const, defaultChapterId: 'intro' };
    expect(parseHash('#/fr/setup', en).locale).toBe('fr');
    expect(parseHash('#/ru/setup', en).locale).toBe('en');
  });
});

describe('anchorResolver', () => {
  const resolve = anchorResolver({ locale: 'ru', chapterId: 'payment' });

  it('keeps a bare section in the current chapter', () => {
    expect(resolve('qr')).toBe('#/ru/payment/qr');
  });

  it('crosses to another chapter when the target names one', () => {
    expect(resolve('refunds/partial')).toBe('#/ru/refunds/partial');
  });

  it('keeps the current locale when crossing chapters', () => {
    expect(anchorResolver({ locale: 'kk', chapterId: 'a' })('b/c')).toBe('#/kk/b/c');
  });
});
```

- [ ] **Step 2: Run it to make sure it fails**

Run: `cd ~/Projects/manual && npx vitest run src/app/route.test.ts`
Expected: FAIL — `Failed to resolve import './route'`.

- [ ] **Step 3: Port `route.ts`**

Copy the reference, keeping its doc comments (the one explaining why routing is hash-based and not history is load-bearing — the offline copy is opened off disk, and the one explaining why `chapter/section` exists as a second form is what justifies the validator check). Changes: generic over `L`, `parseHash` takes the options object above and uses `isLocaleOf(options.locales)`, and `Route` is `RouteContext<L>`.

- [ ] **Step 4: Run the `route.ts` tests**

Run: `cd ~/Projects/manual && npx vitest run src/app/route.test.ts`
Expected: PASS, 9 tests.

- [ ] **Step 5: Write the failing test for `useRoute.ts`**

Create `src/app/useRoute.test.ts`:

```tsx
import { beforeEach, describe, expect, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useRoute } from './useRoute';
import { resolveConfig } from '../config';
import type { Chapter, Manifest } from '../content/types';
import type { BuiltinBlock } from '../content/types';

type L = 'ru' | 'kk';

const manifest: Manifest<L> = {
  version: 1,
  locales: ['ru', 'kk'],
  chapters: [
    { id: 'start', file: '01-start.json' },
    { id: 'payment', file: '02-payment.json' },
  ],
};

const chapters = {
  '../content/ru/01-start.json': { default: { id: 'start', title: 'Н', blocks: [] } as Chapter<BuiltinBlock> },
  '../content/ru/02-payment.json': { default: { id: 'payment', title: 'О', blocks: [] } as Chapter<BuiltinBlock> },
};

const config = (routing: 'hash' | 'memory') =>
  resolveConfig({ root: document.createElement('div'), brand: 'T', manifest, chapters, routing });

beforeEach(() => {
  window.location.hash = '';
  window.localStorage.clear();
});

describe('useRoute in memory mode', () => {
  it('starts at the fallback locale and the first chapter', () => {
    const { result } = renderHook(() => useRoute(config('memory')));
    expect(result.current.route).toEqual({ locale: 'ru', chapterId: 'start', sectionId: undefined });
  });

  it('navigates without touching the URL', () => {
    const { result } = renderHook(() => useRoute(config('memory')));
    act(() => result.current.navigate({ locale: 'ru', chapterId: 'payment' }));
    expect(result.current.route.chapterId).toBe('payment');
    expect(window.location.hash).toBe('');
  });

  it('switches locale and keeps the chapter', () => {
    const { result } = renderHook(() => useRoute(config('memory')));
    act(() => result.current.navigate({ locale: 'ru', chapterId: 'payment' }));
    act(() => result.current.setLocale('kk'));
    expect(result.current.route).toMatchObject({ locale: 'kk', chapterId: 'payment' });
  });
});

describe('useRoute in hash mode', () => {
  it('normalises an empty hash into a shareable one', () => {
    renderHook(() => useRoute(config('hash')));
    expect(window.location.hash).toBe('#/ru/start');
  });

  it('reads an existing hash rather than overwriting it', () => {
    window.location.hash = '#/kk/payment/qr';
    const { result } = renderHook(() => useRoute(config('hash')));
    expect(result.current.route).toEqual({ locale: 'kk', chapterId: 'payment', sectionId: 'qr' });
  });

  it('follows a hashchange the reader caused', () => {
    const { result } = renderHook(() => useRoute(config('hash')));
    act(() => {
      window.location.hash = '#/kk/payment';
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    });
    expect(result.current.route).toMatchObject({ locale: 'kk', chapterId: 'payment' });
  });

  it('remembers the chosen locale per manual, not globally', () => {
    const { result } = renderHook(() => useRoute(config('hash')));
    act(() => result.current.setLocale('kk'));
    expect(window.localStorage.getItem('manual-kit:locale:t')).toBe('kk');
  });

  it('survives localStorage throwing, just without memory', () => {
    const getItem = window.localStorage.getItem;
    window.localStorage.getItem = () => { throw new Error('denied'); };
    try {
      const { result } = renderHook(() => useRoute(config('hash')));
      expect(result.current.route.locale).toBe('ru');
    } finally {
      window.localStorage.getItem = getItem;
    }
  });
});
```

- [ ] **Step 6: Run it to make sure it fails**

Run: `cd ~/Projects/manual && npx vitest run src/app/useRoute.test.ts`
Expected: FAIL — `Failed to resolve import './useRoute'`.

- [ ] **Step 7: Port and parameterise `useRoute.ts`**

Port the reference, keeping its comment about normalising an empty hash so the address bar always holds a copyable link. Changes:

1. Take `config: ResolvedConfig<L, B>` instead of importing `chapterList()`; read `config.content.chapterList()[0]?.id ?? ''`, `config.locales.list`, `config.locales.fallback`.
2. Derive the storage key from the brand: `` const key = `manual-kit:locale:${slug}` `` where `slug` is the brand text lowercased with non-alphanumerics collapsed to `-`, or `'default'` when the brand is a `ReactNode`. Two manuals in one browser must not share a remembered locale.
3. Branch on `config.routing`. In `'memory'` mode, hold the route in `useState`, and make `navigate` a `setState` — no `window.location`, no `hashchange` listener, no normalising effect. Keep both paths in one hook rather than two: the caller should not care, and a second hook is a second place for the locale-memory logic to drift.
4. Keep the `try/catch` around both `localStorage` calls with the reference's comment — a till with storage disabled still gets a working manual, just no memory.

- [ ] **Step 8: Run the tests**

Run: `cd ~/Projects/manual && npx vitest run src/app && npm run typecheck`
Expected: PASS, 9 + 9 tests; typecheck clean.

- [ ] **Step 9: Commit**

```bash
cd ~/Projects/manual
git add src/app/route.ts src/app/route.test.ts src/app/useRoute.ts src/app/useRoute.test.ts
git commit -m "feat: parameterise routing over the configured locales

parseHash takes the locale list and fallback instead of reading library
constants, and useRoute gains a memory mode for tests and for embedding
where the URL is not ours to own.

The remembered-locale key is now per manual: the reference's shared
evrika-manual-locale meant two manuals open in one browser fought over the
reader's language.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 14: Search

**Files:**
- Create: `src/search/index.ts`, `src/search/SearchBox.tsx`
- Test: `src/search/index.test.ts`, `src/search/SearchBox.test.tsx`
- Reference: `~/Projects/evrika-cashier-desktop/manual/src/search/search.ts`, `SearchBox.tsx`

**Interfaces:**
- Consumes: `ContentSource` (Task 11); `BlockRegistry` (Task 3); `ResolvedConfig` (Task 12); `Route` (Task 13); `useManual` (Task 6).
- Produces:
  - `interface SearchEntry { chapterId: string; chapterTitle: string; sectionId?: string; sectionTitle?: string; text: string }`
  - `interface SearchHit extends SearchEntry { score: number; snippet: string }`
  - `function buildEntries<L, B>(chapters: Chapter<B>[], registry: BlockRegistry<B>): SearchEntry[]`
  - `function createSearchIndex<L, B>(content: ContentSource<L, B>, registry: BlockRegistry<B>): { entriesFor(locale: L): SearchEntry[] }`
  - `function search(entries: SearchEntry[], rawQuery: string, options: { minQueryLength: number; maxResults: number }): SearchHit[]`
  - `const SearchBox: ComponentType<{ config: ResolvedConfig<L, B>; route: Route<L>; onNavigate: (next: Route<L>) => void }>`

Three changes from the reference: per-block text comes from `registry.get(type)?.searchText` rather than a switch; the memo cache lives in the index instance rather than in a module-level `Map` keyed by locale (which would leak between two manuals in one process); and `MIN_QUERY_LENGTH` becomes config.

- [ ] **Step 1: Write the failing test**

Create `src/search/index.test.ts`. Port the reference's cases and add the registry-driven ones:

```ts
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
```

- [ ] **Step 2: Run it to make sure it fails**

Run: `cd ~/Projects/manual && npx vitest run src/search/index.test.ts`
Expected: FAIL — `Failed to resolve import './index'`.

- [ ] **Step 3: Write `src/search/index.ts`**

Port `score`, `snippetFor`, `SNIPPET_RADIUS`, `buildEntries` and `search` from the reference verbatim — the scoring comment about «касса» versus «прокассировать» explains a real decision and stays.

One narrowing is needed, per the Global Constraints: `score()`'s word-boundary test reads
`haystack[at - 1]`, which `noUncheckedIndexedAccess` types as `string | undefined` while
`RegExp.test` needs a `string`. `at === 0` is already checked first and short-circuits, so the
index is always in range — make that explicit rather than asserting it:

```ts
const previous = at === 0 ? undefined : haystack[at - 1];
const atWordStart = previous === undefined || /[\s(«"'\-–—/]/.test(previous);
``` Changes:

```ts
/** Flattens a block to the text worth searching; `null` when it has none. */
function textOf<B extends AnyBlock>(block: B, registry: BlockRegistry<B>): string | null {
  return registry.get(block.type)?.searchText(block) ?? null;
}
```

`search` takes `options: { minQueryLength: number; maxResults: number }` in place of the module constant and the `limit = 30` default. And the module-level `indexCache` becomes:

```ts
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
```

- [ ] **Step 4: Run the index tests**

Run: `cd ~/Projects/manual && npx vitest run src/search/index.test.ts`
Expected: PASS, 14 tests.

- [ ] **Step 5: Write the failing test for `SearchBox`**

Create `src/search/SearchBox.test.tsx`:

```tsx
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SearchBox } from './SearchBox';
import { resolveConfig } from '../config';
import { ManualProvider } from '../app/context';
import type { Chapter, Manifest } from '../content/types';
import type { BuiltinBlock } from '../content/types';

type L = 'ru' | 'kk';

const manifest: Manifest<L> = {
  version: 1, locales: ['ru', 'kk'],
  chapters: [{ id: 'payment', file: '01-payment.json' }],
};

const chapter: Chapter<BuiltinBlock> = {
  id: 'payment', title: 'Оплата',
  blocks: [
    { type: 'heading', level: 2, id: 'qr', text: 'Kaspi QR' },
    { type: 'paragraph', text: 'Покажите QR клиенту.' },
  ],
};

function setup(overrides: Partial<Parameters<typeof resolveConfig>[0]> = {}) {
  const config = resolveConfig({
    root: document.createElement('div'), brand: 'T', manifest,
    chapters: { '../content/ru/01-payment.json': { default: chapter } },
    ...overrides,
  } as never);
  const onNavigate = vi.fn();
  render(
    <ManualProvider value={{ strings: config.locales.strings.ru, resolveMedia: () => undefined }}>
      <SearchBox config={config} route={{ locale: 'ru', chapterId: 'payment' }} onNavigate={onNavigate} />
    </ManualProvider>,
  );
  return { onNavigate };
}

describe('SearchBox', () => {
  it('is labelled by the locale placeholder', () => {
    setup();
    expect(screen.getByRole('searchbox', { name: 'Поиск по руководству' })).toBeDefined();
  });

  it('shows the hint below the minimum query length', async () => {
    setup();
    await userEvent.type(screen.getByRole('searchbox'), 'о');
    expect(screen.getByText('Введите хотя бы два символа')).toBeDefined();
  });

  it('shows results for a real query', async () => {
    setup();
    await userEvent.type(screen.getByRole('searchbox'), 'QR');
    // Both the heading and the paragraph below it match «QR», so there are two
    // hits and `getByText` would be ambiguous. Assert the shape of the first
    // instead: a hit names where it lands, chapter then section.
    const hits = screen.getAllByRole('button');
    expect(hits.length).toBeGreaterThan(0);
    expect(hits[0]?.textContent).toContain('Оплата');
    expect(hits[0]?.textContent).toContain('Kaspi QR');
  });

  it('reports an empty result set', async () => {
    setup();
    await userEvent.type(screen.getByRole('searchbox'), 'зззз');
    expect(screen.getByText('Ничего не найдено')).toBeDefined();
  });

  it('navigates to the hit section and clears the query', async () => {
    const { onNavigate } = setup();
    await userEvent.type(screen.getByRole('searchbox'), 'Покажите');
    await userEvent.click(screen.getAllByRole('button')[0]!);
    expect(onNavigate).toHaveBeenCalledWith({ locale: 'ru', chapterId: 'payment', sectionId: 'qr' });
    // `toHaveValue` is a jest-dom matcher and jest-dom is not a dependency
    // here; the typed getter reads the same and needs no cast.
    expect(screen.getByRole<HTMLInputElement>('searchbox').value).toBe('');
  });

  it('renders the renderSearchEmpty slot instead of the default message', async () => {
    setup({ slots: { renderSearchEmpty: ({ query }) => <p>ничего про «{query}»</p> } });
    await userEvent.type(screen.getByRole('searchbox'), 'зззз');
    expect(screen.getByText('ничего про «зззз»')).toBeDefined();
    expect(screen.queryByText('Ничего не найдено')).toBeNull();
  });

  it('renders nothing at all when search is disabled', () => {
    const config = resolveConfig({
      root: document.createElement('div'), brand: 'T', manifest,
      chapters: { '../content/ru/01-payment.json': { default: chapter } },
      search: { enabled: false },
    });
    const { container } = render(
      <ManualProvider value={{ strings: config.locales.strings.ru, resolveMedia: () => undefined }}>
        <SearchBox config={config} route={{ locale: 'ru', chapterId: 'payment' }} onNavigate={vi.fn()} />
      </ManualProvider>,
    );
    expect(container.innerHTML).toBe('');
  });
});
```

Add `@testing-library/user-event@^14.5.2` to devDependencies for this task.

- [ ] **Step 6: Run it to make sure it fails**

Run: `cd ~/Projects/manual && npm i -D @testing-library/user-event@^14.5.2 && npx vitest run src/search/SearchBox.test.tsx`
Expected: FAIL — `Failed to resolve import './SearchBox'`.

- [ ] **Step 7: Port `SearchBox.tsx`**

Port the reference. Changes: takes `config` and `route` instead of `locale`; reads strings from `useManual()`; builds its index with `useMemo(() => createSearchIndex(config.content, config.registry), [config])`; passes `config.search` into `search()`; returns `null` when `config.search.enabled` is false; and renders `config.slots.renderSearchEmpty?.({ ...route, query: trimmed })` in place of the default empty message when the slot exists.

- [ ] **Step 8: Run the tests**

Run: `cd ~/Projects/manual && npx vitest run src/search && npm run typecheck`
Expected: PASS, 14 + 7 tests; typecheck clean.

- [ ] **Step 9: Commit**

```bash
cd ~/Projects/manual
git add src/search package.json package-lock.json
git commit -m "feat: drive search from the registry, per index instance

Per-block text comes from the registered searchText rather than a switch,
so a custom block is searchable without touching the library. The memo
cache moves from a module-level Map into the index instance: two manuals
in one process were answering each other's queries.

Minimum query length and result cap are config now.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 15: Sidebar, section rail and active-section tracking

**Files:**
- Create: `src/app/Sidebar.tsx`, `src/app/OnThisPage.tsx`, `src/app/useActiveSection.ts`
- Test: `src/app/Sidebar.test.tsx`, `src/app/OnThisPage.test.tsx`
- Reference: the same three files under `~/Projects/evrika-cashier-desktop/manual/src/app/`

**Interfaces:**
- Consumes: `ResolvedConfig` (Task 12); `Route`, `routeHref` (Task 13); `SearchBox` (Task 14); `useManual` (Task 6).
- Produces:
  - `const Sidebar: ComponentType<{ config; route; onNavigate; onLocaleChange }>`
  - `const OnThisPage: ComponentType<{ blocks; route; activeId }>` — no `config`; it needs only the strings, which come from context
  - `function useActiveSection(ids: string[], routedId?: string): string | undefined`

`useActiveSection` ports **verbatim** — it takes no locale and no content, and its long comment documents two bugs already fixed (why the observer must not write the hash, and why the band starts at the very top). Do not touch it.

The Sidebar's hardcoded `Evrika Cashier` becomes `config.brand`, rendered through `config.slots.renderBrand` when that slot is set. The locale labels come from `config.locales.labels`.

- [ ] **Step 1: Write the failing test for `Sidebar`**

Create `src/app/Sidebar.test.tsx`. Port the reference's cases, then add:

```tsx
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Sidebar } from './Sidebar';
import { resolveConfig } from '../config';
import { ManualProvider } from './context';
import type { Chapter, Manifest } from '../content/types';
import type { BuiltinBlock } from '../content/types';

type L = 'ru' | 'kk';

const manifest: Manifest<L> = {
  version: 1, locales: ['ru', 'kk'],
  chapters: [
    { id: 'start', file: '01-start.json' },
    { id: 'payment', file: '02-payment.json' },
  ],
};

const chapters = {
  '../content/ru/01-start.json': { default: { id: 'start', title: 'Начало', blocks: [] } as Chapter<BuiltinBlock> },
  '../content/ru/02-payment.json': { default: { id: 'payment', title: 'Оплата', blocks: [] } as Chapter<BuiltinBlock> },
};

function setup(overrides: Record<string, unknown> = {}) {
  const config = resolveConfig({
    root: document.createElement('div'), brand: 'EG Delivery', manifest, chapters, ...overrides,
  } as never);
  const onNavigate = vi.fn();
  const onLocaleChange = vi.fn();
  render(
    <ManualProvider value={{ strings: config.locales.strings.ru, resolveMedia: () => undefined }}>
      <Sidebar
        config={config}
        route={{ locale: 'ru', chapterId: 'payment' }}
        onNavigate={onNavigate}
        onLocaleChange={onLocaleChange}
      />
    </ManualProvider>,
  );
  return { onNavigate, onLocaleChange };
}

describe('Sidebar', () => {
  it('renders the configured brand, not a hardcoded one', () => {
    setup();
    expect(screen.getByText('EG Delivery')).toBeDefined();
    expect(screen.queryByText('Evrika Cashier')).toBeNull();
  });

  it('renders the renderBrand slot when given one', () => {
    setup({ slots: { renderBrand: () => <img alt="EG" src="/logo.svg" /> } });
    expect(screen.getByAltText('EG')).toBeDefined();
  });

  it('lists every chapter, numbered, in manifest order', () => {
    setup();
    expect([...document.querySelectorAll('.toc-number')].map((n) => n.textContent)).toEqual(['1', '2']);
    expect([...document.querySelectorAll('.toc-title')].map((n) => n.textContent))
      .toEqual(['Начало', 'Оплата']);
  });

  it('marks the current chapter', () => {
    setup();
    expect(document.querySelector('.toc-link-active')?.textContent).toContain('Оплата');
  });

  it('offers one button per locale, labelled with its own name', () => {
    setup();
    expect(screen.getByRole('button', { name: 'Русский' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Қазақ тілі' })).toBeDefined();
  });

  it('reports a locale choice', async () => {
    const { onLocaleChange } = setup();
    await userEvent.click(screen.getByRole('button', { name: 'Қазақ тілі' }));
    expect(onLocaleChange).toHaveBeenCalledWith('kk');
  });

  it('groups the locale switch under the localised label', () => {
    setup();
    expect(screen.getByRole('group', { name: 'Язык' })).toBeDefined();
  });

  it('collapses and expands the body for a narrow window', async () => {
    setup();
    const toggle = screen.getByRole('button', { name: 'Открыть разделы' });
    expect(document.getElementById('sidebar-body')?.dataset.open).toBe('false');
    await userEvent.click(toggle);
    expect(document.getElementById('sidebar-body')?.dataset.open).toBe('true');
    expect(screen.getByRole('button', { name: 'Закрыть разделы' })).toBeDefined();
  });

  it('renders the renderSidebarFooter slot', () => {
    setup({ slots: { renderSidebarFooter: () => <small>v1.2.3</small> } });
    expect(screen.getByText('v1.2.3')).toBeDefined();
  });

  it('omits the search box when search is disabled', () => {
    setup({ search: { enabled: false } });
    expect(screen.queryByRole('searchbox')).toBeNull();
  });
});
```

- [ ] **Step 2: Run it to make sure it fails**

Run: `cd ~/Projects/manual && npx vitest run src/app/Sidebar.test.tsx`
Expected: FAIL — `Failed to resolve import './Sidebar'`.

- [ ] **Step 3: Port `useActiveSection.ts` verbatim**

Copy `~/Projects/evrika-cashier-desktop/manual/src/app/useActiveSection.ts` unchanged, comments included. It has no locale or content dependency. Its comment records why the observer reports rather than routes, and why `rootMargin` starts at the very top — both are fixed bugs, and rewording either invites their return.

- [ ] **Step 4: Port `Sidebar.tsx`**

Port the reference, keeping its comments about the single header row and about `open` being consulted only below the 900px breakpoint. Changes:
1. `<span className="sidebar-brand">Evrika Cashier</span>` becomes `config.slots.renderBrand?.(route) ?? <span className="sidebar-brand">{config.brand}</span>`.
2. `LOCALE_LABELS` and `LOCALES` become `config.locales.labels` and `config.locales.list`. Delete the local constant — its comment about a language's own name never being translated moves to `builtins.ts` (Task 2 already has it).
3. `tableOfContents(route.locale)` becomes `config.content.tableOfContents(route.locale)`.
4. `ui(route.locale)` becomes `useManual().strings`.
5. Render `config.slots.renderSidebarFooter?.(route)` at the foot of `.sidebar-body`.
6. `<SearchBox>` gets `config` and `route`; it returns `null` itself when search is off, so no branch is needed here.

- [ ] **Step 5: Run the Sidebar tests**

Run: `cd ~/Projects/manual && npx vitest run src/app/Sidebar.test.tsx`
Expected: PASS, 10 tests.

- [ ] **Step 6: Write the failing test for `OnThisPage`**

Create `src/app/OnThisPage.test.tsx`, porting the reference's cases:

```tsx
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { OnThisPage } from './OnThisPage';
import { ManualProvider } from './context';
import { BUILTIN_STRINGS } from './strings';
import type { BuiltinBlock } from '../content/types';

const route = { locale: 'ru' as const, chapterId: 'payment' };

function setup(blocks: BuiltinBlock[], activeId?: string) {
  return render(
    <ManualProvider value={{ strings: BUILTIN_STRINGS.ru, resolveMedia: () => undefined }}>
      <OnThisPage blocks={blocks} route={route} activeId={activeId} />
    </ManualProvider>,
  );
}

const blocks: BuiltinBlock[] = [
  { type: 'heading', level: 2, id: 'qr', text: 'Kaspi QR' },
  { type: 'paragraph', text: 'тело' },
  { type: 'heading', level: 3, id: 'cash', text: 'Наличные' },
];

describe('OnThisPage', () => {
  it('lists only headings, in order, linked by anchor', () => {
    setup(blocks);
    const links = [...document.querySelectorAll('.rail-link')];
    expect(links.map((a) => a.textContent)).toEqual(['Kaspi QR', 'Наличные']);
    expect(links[0]?.getAttribute('href')).toBe('#/ru/payment/qr');
  });

  it('carries the heading level, so the rail can indent', () => {
    setup(blocks);
    expect([...document.querySelectorAll('.rail-link')].map((a) => a.getAttribute('data-level')))
      .toEqual(['2', '3']);
  });

  it('marks the active section for assistive tech as well as by class', () => {
    setup(blocks, 'cash');
    const active = document.querySelector('.rail-link-active');
    expect(active?.textContent).toBe('Наличные');
    expect(active?.getAttribute('aria-current')).toBe('true');
  });

  it('renders nothing for a chapter with no headings, not an empty heading', () => {
    const { container } = setup([{ type: 'paragraph', text: 'тело' }]);
    expect(container.innerHTML).toBe('');
  });

  it('is labelled with the localised section title', () => {
    setup(blocks);
    expect(screen.getByRole('navigation', { name: 'В этом разделе' })).toBeDefined();
  });
});
```

- [ ] **Step 7: Port `OnThisPage.tsx`**

Port the reference, keeping the comment explaining that it is the only place a reader can see a flat chapter's shape, and that `activeId` is display-only. One change: `ui(route.locale)` becomes `useManual().strings`. It needs no `config`, so drop that parameter from the signature — its props stay `{ blocks, route, activeId }`.

- [ ] **Step 8: Run the tests**

Run: `cd ~/Projects/manual && npx vitest run src/app && npm run typecheck`
Expected: PASS, all app suites; typecheck clean.

- [ ] **Step 9: Commit**

```bash
cd ~/Projects/manual
git add src/app/Sidebar.tsx src/app/Sidebar.test.tsx src/app/OnThisPage.tsx src/app/OnThisPage.test.tsx src/app/useActiveSection.ts
git commit -m "feat: port the sidebar and the section rail

The sidebar's brand is config now, with a slot for a logo. That hardcoded
«Evrika Cashier» is the bug the courier manual still ships, and a test
asserts it is gone.

useActiveSection ports verbatim: its comments record two fixed bugs — why
the observer reports rather than routes, and why the band starts at the
very top — and rewording either invites them back.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 16: ChapterView

**Files:**
- Create: `src/app/ChapterView.tsx`
- Test: `src/app/ChapterView.test.tsx`
- Reference: `~/Projects/evrika-cashier-desktop/manual/src/app/ChapterView.tsx`

**Interfaces:**
- Consumes: `BlockList` (Task 10); `ContentSource` via `config.content` (Task 11); `OnThisPage`, `useActiveSection` (Task 15); `anchorResolver`, `routeHref` (Task 13); `useManual` (Task 6).
- Produces: `const ChapterView: ComponentType<{ config: ResolvedConfig<L, B>; route: Route<L> }>`

Changes from the reference: `loadChapter`/`tableOfContents` come from `config.content`; strings from `useManual()`; blocks render through `BlockList` with `config.registry`; and `config.slots.renderChapterFooter` renders below the prev/next nav.

- [ ] **Step 1: Write the failing test**

Create `src/app/ChapterView.test.tsx`. Port the reference's cases and add the slot and fallback ones:

```tsx
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ChapterView } from './ChapterView';
import { resolveConfig } from '../config';
import { ManualProvider } from './context';
import type { Chapter, Manifest } from '../content/types';
import type { BuiltinBlock } from '../content/types';

type L = 'ru' | 'kk';

const manifest: Manifest<L> = {
  version: 1, locales: ['ru', 'kk'],
  chapters: [
    { id: 'start', file: '01-start.json' },
    { id: 'payment', file: '02-payment.json' },
    { id: 'history', file: '03-history.json' },
  ],
};

const payment: Chapter<BuiltinBlock> = {
  id: 'payment', title: 'Оплата',
  blocks: [
    { type: 'heading', level: 2, id: 'qr', text: 'Kaspi QR' },
    { type: 'paragraph', text: 'Покажите QR.' },
  ],
};

// Kazakh has 'start' but not 'payment': the fallback path is what this covers.
const chapters = {
  '../content/ru/01-start.json': { default: { id: 'start', title: 'Начало', blocks: [] } as Chapter<BuiltinBlock> },
  '../content/ru/02-payment.json': { default: payment },
  '../content/ru/03-history.json': { default: { id: 'history', title: 'История', blocks: [] } as Chapter<BuiltinBlock> },
  '../content/kk/01-start.json': { default: { id: 'start', title: 'Бастау', blocks: [] } as Chapter<BuiltinBlock> },
};

function setup(route: { locale: L; chapterId: string; sectionId?: string }, overrides: Record<string, unknown> = {}) {
  const config = resolveConfig({
    root: document.createElement('div'), brand: 'T', manifest, chapters, ...overrides,
  } as never);
  return render(
    <ManualProvider value={{ strings: config.locales.strings[route.locale], resolveMedia: () => undefined }}>
      <ChapterView config={config} route={route} />
    </ManualProvider>,
  );
}

describe('ChapterView', () => {
  it('renders the chapter title and its blocks', () => {
    setup({ locale: 'ru', chapterId: 'payment' });
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Оплата');
    expect(screen.getByText('Покажите QR.')).toBeDefined();
  });

  it('renders the section rail for a chapter with headings', () => {
    setup({ locale: 'ru', chapterId: 'payment' });
    expect(screen.getByRole('navigation', { name: 'В этом разделе' })).toBeDefined();
  });

  it('shows the fallback notice when the locale lacks the chapter', () => {
    setup({ locale: 'kk', chapterId: 'payment' });
    expect(screen.getByText('Бұл бөлім әлі аударылмаған — орысша мәтін көрсетілген.')).toBeDefined();
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Оплата');
  });

  it('shows no notice when the chapter is genuinely translated', () => {
    setup({ locale: 'kk', chapterId: 'start' });
    expect(screen.queryByText(/аударылмаған/)).toBeNull();
  });

  it('reports a chapter that does not exist at all', () => {
    setup({ locale: 'ru', chapterId: 'ghost' });
    expect(screen.getByText('Раздел не найден.')).toBeDefined();
  });

  it('links both neighbours by title', () => {
    setup({ locale: 'ru', chapterId: 'payment' });
    const previous = document.querySelector('.chapter-nav-previous');
    const next = document.querySelector('.chapter-nav-next');
    expect(previous?.textContent).toContain('Начало');
    expect(previous?.getAttribute('href')).toBe('#/ru/start');
    expect(next?.textContent).toContain('История');
  });

  it('omits the previous link on the first chapter and the next on the last', () => {
    setup({ locale: 'ru', chapterId: 'start' });
    expect(document.querySelector('.chapter-nav-previous')).toBeNull();
    expect(document.querySelector('.chapter-nav-next')).not.toBeNull();

    setup({ locale: 'ru', chapterId: 'history' });
    expect(document.querySelectorAll('.chapter-nav-next')).toHaveLength(1);
  });

  it('renders the renderChapterFooter slot', () => {
    setup({ locale: 'ru', chapterId: 'payment' }, {
      slots: { renderChapterFooter: ({ chapterId }) => <p>правки: {chapterId}</p> },
    });
    expect(screen.getByText('правки: payment')).toBeDefined();
  });

  it('renders a block type from a custom registry', () => {
    setup({ locale: 'ru', chapterId: 'payment' });
    expect(document.querySelector('.heading-2')).not.toBeNull();
  });
});
```

The second `setup` call in the seventh test renders a second tree into the same document; scope the assertion to the most recent container if the port makes that ambiguous — split the test in two rather than reaching for `cleanup()` mid-test.

- [ ] **Step 2: Run it to make sure it fails**

Run: `cd ~/Projects/manual && npx vitest run src/app/ChapterView.test.tsx`
Expected: FAIL — `Failed to resolve import './ChapterView'`.

- [ ] **Step 3: Port `ChapterView.tsx`**

Port the reference in full, keeping `useSectionScroll` and its comment about why a reader landing at the top of a long chapter with no clue which line they were sent to is the usual failure of an anchored docs link, and keeping the comment about hooks running before the early return. Keep `neighbours()` and the comment on the nav that both links name their chapter.

Changes:
1. `({ route })` becomes `({ config, route })`.
2. `loadChapter(...)` → `config.content.loadChapter(...)`; `tableOfContents(...)` → `config.content.tableOfContents(...)`.
3. `ui(route.locale)` → `useManual().strings`.
4. The `chapter.blocks.map(...)` with `<Block>` becomes one `<BlockList blocks={chapter.blocks} registry={config.registry} resolveAnchor={resolveAnchor} />`.
5. `<OnThisPage>` keeps its three props.
6. `config.slots.renderChapterFooter?.(route)` renders after `</nav>`, inside `<main>`.

- [ ] **Step 4: Run the tests**

Run: `cd ~/Projects/manual && npx vitest run src/app/ChapterView.test.tsx && npm run typecheck`
Expected: PASS, 9 tests; typecheck clean.

- [ ] **Step 5: Commit**

```bash
cd ~/Projects/manual
git add src/app/ChapterView.tsx src/app/ChapterView.test.tsx
git commit -m "feat: port the chapter view onto the content source and registry

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 17: The shell, the entry point, and the public barrel

**Files:**
- Create: `src/Manual.tsx`, `src/renderManual.tsx`
- Modify: `src/index.ts` (replace the `VERSION`-only stub with the real barrel; keep `VERSION`)
- Test: `src/Manual.test.tsx`
- Reference: `~/Projects/evrika-cashier-desktop/manual/src/App.tsx`, `main.tsx`

**Interfaces:**
- Consumes: everything above.
- Produces:
  - `const Manual: ComponentType<{ config: ResolvedConfig<L, B> }>`
  - `function renderManual<L, B>(config: ManualConfig<L, B>): { unmount(): void }`
  - `src/index.ts` exporting the full public API listed in the spec.

`Manual` owns three things the reference `App.tsx` did not: the `ManualProvider`, the `color-scheme` attribute on `<html>`, and the document title and `<html lang>`. All three are effects on the document, so they live at the top of the tree rather than in `renderManual` — which keeps them working for a consumer who renders `<Manual>` inside their own React app instead of calling `renderManual`.

- [ ] **Step 1: Write the failing test**

Create `src/Manual.test.tsx`:

```tsx
import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Manual } from './Manual';
import { renderManual } from './renderManual';
import { resolveConfig } from './config';
import type { Chapter, Manifest } from './content/types';
import type { BuiltinBlock } from './content/types';

type L = 'ru' | 'kk';

const manifest: Manifest<L> = {
  version: 1, locales: ['ru', 'kk'],
  chapters: [{ id: 'start', file: '01-start.json' }],
};

const chapters = {
  '../content/ru/01-start.json': {
    default: {
      id: 'start', title: 'Начало',
      blocks: [{ type: 'paragraph', text: 'тело' }],
    } as Chapter<BuiltinBlock>,
  },
};

const config = (overrides: Record<string, unknown> = {}) =>
  resolveConfig({
    root: document.createElement('div'), brand: 'EG Delivery',
    manifest, chapters, routing: 'memory', ...overrides,
  } as never);

beforeEach(() => {
  window.location.hash = '';
  document.documentElement.removeAttribute('data-color-scheme');
  document.documentElement.lang = '';
});

describe('Manual', () => {
  it('renders the sidebar, the chapter and the layout container', () => {
    render(<Manual config={config()} />);
    expect(screen.getByText('EG Delivery')).toBeDefined();
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Начало');
    expect(document.querySelector('.manual')).not.toBeNull();
  });

  it('provides strings to its subtree, so no child throws', () => {
    expect(() => render(<Manual config={config()} />)).not.toThrow();
  });

  it('sets the colour scheme on the document element', () => {
    render(<Manual config={config({ colorScheme: 'system' })} />);
    expect(document.documentElement.dataset.colorScheme).toBe('system');
  });

  it('defaults the colour scheme to light', () => {
    render(<Manual config={config()} />);
    expect(document.documentElement.dataset.colorScheme).toBe('light');
  });

  it('syncs the document title and the html lang to the route', () => {
    render(<Manual config={config()} />);
    expect(document.title).toBe('Начало — EG Delivery');
    expect(document.documentElement.lang).toBe('ru');
  });

  it('honours a custom document title', () => {
    render(<Manual config={config({ document: { title: ({ chapterId }) => `docs/${chapterId}` } })} />);
    expect(document.title).toBe('docs/start');
  });
});

describe('renderManual', () => {
  it('mounts into the given root and unmounts cleanly', () => {
    const root = document.createElement('div');
    document.body.append(root);

    const handle = renderManual({
      root, brand: 'EG Delivery', manifest, chapters, routing: 'memory',
    });
    expect(root.textContent).toContain('Начало');

    handle.unmount();
    expect(root.textContent).toBe('');
    root.remove();
  });

  it('throws the config error rather than mounting a broken shell', () => {
    expect(() =>
      renderManual({
        root: document.createElement('div'), brand: 'T',
        manifest: { ...manifest, chapters: [] }, chapters,
      }),
    ).toThrow(/no chapters/i);
  });
});
```

- [ ] **Step 2: Run it to make sure it fails**

Run: `cd ~/Projects/manual && npx vitest run src/Manual.test.tsx`
Expected: FAIL — `Failed to resolve import './Manual'`.

- [ ] **Step 3: Write `src/Manual.tsx`**

```tsx
import { useEffect, useMemo } from 'react';
import type { AnyBlock } from './content/types';
import type { ResolvedConfig } from './config';
import { ManualProvider } from './app/context';
import { Sidebar } from './app/Sidebar';
import { ChapterView } from './app/ChapterView';
import { useRoute } from './app/useRoute';

/**
 * The whole shell: three columns and the document-level state that goes with
 * them.
 *
 * The `colorScheme` attribute, the title and `<html lang>` are set here rather
 * than in `renderManual`, so they keep working for a consumer who renders
 * `<Manual>` inside a larger React app instead of calling `renderManual`.
 */
export function Manual<L extends string, B extends AnyBlock>({
  config,
}: {
  config: ResolvedConfig<L, B>;
}) {
  const { route, navigate, setLocale } = useRoute(config);

  const strings = config.locales.strings[route.locale];
  const value = useMemo(
    () => ({ strings, resolveMedia: config.resolveMedia }),
    [strings, config.resolveMedia],
  );

  // `color-scheme` has to be on the root element for `light-dark()` to resolve
  // anywhere below it, and the stylesheet reads this attribute rather than a
  // media query so a consumer's choice beats the reader's OS.
  useEffect(() => {
    document.documentElement.dataset.colorScheme = config.colorScheme;
  }, [config.colorScheme]);

  useEffect(() => {
    document.title = config.documentTitle(route);
    document.documentElement.lang = route.locale;
  }, [config, route]);

  return (
    <ManualProvider value={value}>
      {/* `.manual` is the container query root — the shell reflows by its own
          width, so it works embedded in a panel and not only full-page. */}
      <div className="manual">
        <Sidebar
          config={config}
          route={route}
          onNavigate={navigate}
          onLocaleChange={setLocale}
        />
        {/* Content and the rail are siblings of the sidebar: three columns on a
            wide window, and the rail moves above the text on a narrow one,
            purely in CSS. */}
        <ChapterView config={config} route={route} />
      </div>
    </ManualProvider>
  );
}
```

- [ ] **Step 4: Write `src/renderManual.tsx`**

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import type { AnyBlock } from './content/types';
import { resolveConfig, type ManualConfig } from './config';
import { Manual } from './Manual';

/**
 * Mounts a manual. The one call a consumer's `main.tsx` makes.
 *
 * `resolveConfig` runs before `createRoot`, so a config error is a thrown
 * exception at startup rather than a React error boundary swallowing it into a
 * blank page.
 */
export function renderManual<L extends string, B extends AnyBlock>(
  config: ManualConfig<L, B>,
): { unmount(): void } {
  const resolved = resolveConfig(config);
  const root = createRoot(resolved.root);

  root.render(
    <StrictMode>
      <Manual config={resolved} />
    </StrictMode>,
  );

  return { unmount: () => root.unmount() };
}
```

- [ ] **Step 5: Write `src/index.ts`**

Export exactly the public API the spec lists, and nothing else — an accidental export is a maintenance promise. Keep `export const VERSION = '0.1.0';`. Include: `renderManual`, `Manual`, `resolveConfig`; types `ManualConfig`, `ResolvedConfig`, `UiStrings`, `Slots`, `RouteContext`; `defineBlock`, `createRegistry`, `builtinBlocks`, `defaultRegistry`, and the nine individual specs; types `BlockSpec`, `BlockRegistry`, `BlockProps`, `BlockBase`, `AnyBlock`, `AnchorResolver`, `JsonSchema`; `createContentSource` and types `Chapter`, `Manifest`, `ManifestChapter`, `ContentSource`, `LoadedChapter`, `BuiltinLocale`, `BuiltinBlock`, and every individual block interface; `BUILTIN_LOCALES`, `BUILTIN_LOCALE_LABELS`, `BUILTIN_STRINGS`, `UI_STRING_KEYS`; the parts `Sidebar`, `ChapterView`, `OnThisPage`, `SearchBox`, `BlockList`, `ManualProvider`; the hooks `useRoute`, `useActiveSection`, `useManual`; `routeHref`, `anchorResolver`, `parseHash`; `createSearchIndex`, `buildEntries`, `search` and types `SearchEntry`, `SearchHit`; `createMediaResolver`.

- [ ] **Step 6: Run the tests**

Run: `cd ~/Projects/manual && npx vitest run && npm run typecheck`
Expected: PASS, every suite; typecheck clean.

- [ ] **Step 7: Commit**

```bash
cd ~/Projects/manual
git add src/Manual.tsx src/Manual.test.tsx src/renderManual.tsx src/index.ts
git commit -m "feat: assemble the shell, the entry point and the public barrel

Document-level state — colour scheme, title, html lang — lives in <Manual>
rather than renderManual, so it still works for a consumer who renders the
shell inside a larger React app.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 18: The stylesheet

**Files:**
- Create: `src/styles/tokens.css`, `src/styles/manual.css`
- Test: `src/styles/tokens.test.ts`
- Reference: `~/Projects/evrika-cashier-desktop/manual/src/styles.css` (895 lines — read it in full before starting)

**Interfaces:**
- Consumes: the class names every component above renders. Grep them out rather than trusting this list: `manual`, `sidebar*`, `locale-switch`, `locale-button*`, `toc*`, `search*`, `content`, `chapter*`, `rail*`, `heading*`, `paragraph`, `list*`, `steps*`, `figure*`, `callout*`, `notice*`, `table*`, `keys*`, `inline-link`, `is-targeted`.
  **`callout` and `notice` are two families, not one.** `.callout` styles an authored callout
  block and needs all four variants (`info`, `warning`, `danger`, `success`); `.notice` styles the
  shell's own messages and needs only `info` and `warning`, which is all `ChapterView` renders.
  The reference shares their base rule and the two overlapping variants via a selector list —
  keep that, and do not let the shorter family swallow the longer one.
- Produces: `dist/styles.css`, one file, imported by consumers as `@evrika/manual-kit/styles.css`.

This is a rewrite, not a port. Work rule-by-rule through the reference so no state is lost — the hover, focus, active, `data-open`, `data-level` and `is-targeted` rules are easy to drop and invisible when dropped.

- [ ] **Step 1: Write the failing test**

A stylesheet is checked by eye, but the token contract is checkable and is the thing consumers depend on. Create `src/styles/tokens.test.ts`:

```ts
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const tokens = readFileSync(new URL('./tokens.css', import.meta.url), 'utf8');
const manual = readFileSync(new URL('./manual.css', import.meta.url), 'utf8');

/** Every token a consumer's theme.css is documented to be able to override. */
const CONTRACT = [
  '--manual-brand', '--manual-brand-strong', '--manual-brand-tint',
  '--manual-text', '--manual-text-muted', '--manual-surface',
  '--manual-surface-alt', '--manual-line',
  '--manual-warning', '--manual-warning-tint', '--manual-danger',
  '--manual-danger-tint', '--manual-success', '--manual-success-tint',
  '--manual-font', '--manual-font-mono',
  '--manual-sidebar-width', '--manual-content-width', '--manual-rail-width',
  '--manual-radius', '--manual-radius-lg',
  '--manual-space-1', '--manual-space-2', '--manual-space-3',
  '--manual-space-4', '--manual-space-5', '--manual-space-6',
  '--manual-step-0', '--manual-step-1', '--manual-step-2', '--manual-step-3',
  '--manual-step-small', '--manual-step-tiny',
  '--manual-breakpoint-narrow', '--manual-breakpoint-wide',
];

describe('token contract', () => {
  it('declares every documented token', () => {
    for (const token of CONTRACT) {
      expect(tokens, token).toContain(`${token}:`);
    }
  });

  it('namespaces every custom property, so a consumer page cannot collide', () => {
    const declared = [...tokens.matchAll(/^\s*(--[a-z0-9-]+):/gm)].map((match) => match[1]!);
    expect(declared.length).toBeGreaterThan(0);
    for (const name of declared) {
      expect(name, name).toMatch(/^--manual-/);
    }
  });

  it('declares the layer order once, first, and exactly as specified', () => {
    expect(manual.trimStart()).toMatch(
      /^(\/\*[\s\S]*?\*\/\s*)?@layer tokens, base, layout, blocks, utilities, overrides;/,
    );
    expect([...manual.matchAll(/@layer tokens, base/g)]).toHaveLength(1);
  });

  it('derives brand tints from the brand rather than hardcoding them', () => {
    expect(tokens).toMatch(/--manual-brand-tint:\s*color-mix\(/);
    expect(tokens).toMatch(/--manual-brand-strong:\s*color-mix\(/);
  });

  it('types the length tokens with @property, so a bad override degrades', () => {
    for (const token of ['--manual-sidebar-width', '--manual-content-width', '--manual-rail-width']) {
      expect(tokens, token).toMatch(new RegExp(`@property ${token}\\b`));
    }
  });

  it('reads the colour scheme from the attribute Manual sets', () => {
    expect(tokens).toContain('[data-color-scheme="dark"]');
    expect(tokens).toContain('[data-color-scheme="system"]');
  });

  it('uses container queries rather than viewport media queries for layout', () => {
    expect(manual).toContain('@container');
    expect(manual).toMatch(/container-name:\s*manual|container:\s*manual/);
    // Media queries are still right for preferences, never for layout width.
    for (const query of [...manual.matchAll(/@media[^{]+/g)].map((m) => m[0])) {
      expect(query, query).toMatch(/prefers-|print/);
    }
  });

  it('keeps every rule inside a layer, so unlayered consumer CSS wins', () => {
    const withoutComments = manual.replace(/\/\*[\s\S]*?\*\//g, '');
    const afterLayers = withoutComments.replace(/@layer [a-z, ]+;/, '');
    // Every top-level block must open a layer or an at-rule, never a bare selector.
    const topLevel = afterLayers.match(/^[^\s@}][^{]*\{/gm) ?? [];
    expect(topLevel).toEqual([]);
  });
});
```

- [ ] **Step 2: Run it to make sure it fails**

Run: `cd ~/Projects/manual && npx vitest run src/styles/tokens.test.ts`
Expected: FAIL — `ENOENT`, no `tokens.css`.

- [ ] **Step 3: Write `src/styles/tokens.css`**

Every custom property is prefixed `--manual-`. The reference's bare `--primary`, `--text`, `--line` would collide with a host page's own variables the moment the shell is embedded, and a collision in a custom property is silent.

```css
@layer tokens {
  /*
   * One brand seed, in oklch. The reference implementation hand-picked six
   * teal hexes and three tint pairs; derived values stay in gamut and stay in
   * step, and retheming is one declaration rather than fourteen.
   *
   * Semantic colours keep their own seeds: warning, danger and success carry
   * meaning, and must not follow a brand hue.
   */
  @property --manual-sidebar-width { syntax: '<length>'; inherits: true; initial-value: 320px; }
  @property --manual-content-width { syntax: '<length>'; inherits: true; initial-value: 780px; }
  @property --manual-rail-width    { syntax: '<length>'; inherits: true; initial-value: 240px; }

  :root {
    /* #019AAC, the desktop app's primary, as oklch. */
    --manual-brand: oklch(60.5% 0.098 208);
    --manual-brand-strong: color-mix(in oklab, var(--manual-brand) 82%, black);
    --manual-brand-tint: color-mix(in oklab, var(--manual-brand) 12%, var(--manual-surface));

    --manual-text: light-dark(oklch(28% 0.02 245), oklch(93% 0.01 245));
    --manual-text-muted: light-dark(oklch(54% 0.02 245), oklch(70% 0.015 245));
    --manual-surface: light-dark(#fff, oklch(21% 0.012 245));
    --manual-surface-alt: light-dark(oklch(98% 0.004 210), oklch(25% 0.014 245));
    --manual-line: light-dark(oklch(92% 0.008 210), oklch(32% 0.015 245));

    --manual-warning: oklch(76% 0.145 70);
    --manual-warning-tint: color-mix(in oklab, var(--manual-warning) 16%, var(--manual-surface));
    --manual-danger: oklch(60% 0.19 22);
    --manual-danger-tint: color-mix(in oklab, var(--manual-danger) 14%, var(--manual-surface));
    --manual-success: oklch(60% 0.14 145);
    --manual-success-tint: color-mix(in oklab, var(--manual-success) 14%, var(--manual-surface));

    /*
     * Fonts are not bundled: a manual is opened in a browser or a webview, and
     * a font file per weight would dwarf the rest of the single-file build. The
     * stack falls back to the system UI face, which is what a till has anyway.
     */
    --manual-font: 'Nunito', 'Mulish', system-ui, -apple-system, 'Segoe UI', sans-serif;
    --manual-font-mono: ui-monospace, 'SF Mono', Menlo, monospace;

    --manual-sidebar-width: 320px;
    --manual-content-width: 780px;
    --manual-rail-width: 240px;
    --manual-radius: 6px;
    --manual-radius-lg: 12px;

    /*
     * One spacing scale for the whole manual. Every block used to carry its own
     * bottom margin — 14, 16, 18, 20, 28 — which is why a paragraph after a
     * table sat differently from a paragraph after a list. Blocks spend these,
     * so vertical rhythm is a property of the page rather than of whichever
     * block happens to be above.
     */
    --manual-space-1: 4px;
    --manual-space-2: 8px;
    --manual-space-3: 12px;
    --manual-space-4: 18px;
    --manual-space-5: 28px;
    --manual-space-6: 40px;

    /* Type scale, ~1.25 between steps, fluid at the top end only. */
    --manual-step-0: 1rem;
    --manual-step-1: 1.125rem;
    --manual-step-2: clamp(1.25rem, 1.1rem + 0.6cqi, 1.375rem);
    --manual-step-3: clamp(1.5rem, 1.2rem + 1.4cqi, 1.875rem);
    --manual-step-small: 0.875rem;
    --manual-step-tiny: 0.78rem;

    --manual-breakpoint-narrow: 900px;
    --manual-breakpoint-wide: 1200px;

    color-scheme: light;
  }

  /*
   * `Manual` sets this attribute from `config.colorScheme`. An attribute rather
   * than a `prefers-color-scheme` query, so a consumer's choice beats the
   * reader's OS — a product manual that flips to dark unasked is a surprise,
   * and `'system'` is how a consumer opts into the OS following.
   */
  :root[data-color-scheme='dark'] { color-scheme: dark; }
  :root[data-color-scheme='system'] { color-scheme: light dark; }
}
```

- [ ] **Step 4: Write `src/styles/manual.css`**

Structure:

```css
/* Layer order first: unlayered CSS beats every layer, so a consumer's
   theme.css wins with no !important and no knowledge of this line. */
@layer tokens, base, layout, blocks, utilities, overrides;

@import './tokens.css';

@layer base { /* reset, body type, links, focus-visible, reduced-motion */ }
@layer layout { /* .manual container, sidebar, content, rail, container queries */ }
@layer blocks { /* every block component, nested */ }
@layer utilities { /* .is-targeted, visually-hidden, print */ }
```

Rules for the rewrite, each traceable to a decision in the spec:

- `.manual { container: manual / inline-size; }` and every layout breakpoint as `@container manual (inline-size < 900px)` / `(inline-size >= 1200px)`. `@media` survives only for `prefers-reduced-motion`, `prefers-contrast` and `print`.
- Nesting for each component: one top-level selector per block with its modifiers, states and children nested inside. `&:hover`, `&:focus-visible`, `&[data-open='true']`, `&[data-level='3']`.
- Logical properties throughout: `padding-inline`, `margin-block-end`, `border-inline-start`, `inset-inline-start`. No `left`/`right`/`margin-top` — this is what leaves the manual RTL-ready.
- `scroll-margin-block-start: var(--manual-space-5)` on every heading, so a routed anchor lands below the sticky header instead of under it.
- `text-wrap: balance` on `h1`, `.heading`; `text-wrap: pretty` on `.paragraph`, `.list-item`, `.steps-text`.
- `:has()` where the reference needed a class from JS: e.g. `.figure:has(figcaption)`, `.rail:has(.rail-link-active)`.
- `:focus-visible` rings on every interactive element — `.toc-link`, `.locale-button`, `.search-hit`, `.rail-link`, `.chapter-nav-link`, `.heading-anchor`. Verify against the reference that none is lost.
- `@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; } }` — the one justified `!important`, in `utilities`.
- `.is-targeted` keeps its highlight (`ChapterView` adds the class for 1600ms).
- `@layer overrides {}` is declared empty, with a comment saying it exists for a consumer who prefers to be explicit.

Work through the reference top to bottom and tick off each selector. When done, grep both files for every class name in the Interfaces list above and confirm each is styled.

- [ ] **Step 5: Run the token tests**

Run: `cd ~/Projects/manual && npx vitest run src/styles/tokens.test.ts`
Expected: PASS, 9 tests.

- [ ] **Step 6: Verify nothing was lost from the reference**

Run:

```bash
cd ~/Projects/manual
# Every class the components render must be styled.
for c in manual sidebar sidebar-head sidebar-brand sidebar-body sidebar-toggle \
         callout callout-info callout-warning callout-danger callout-success \
         notice notice-info notice-warning \
         locale-switch locale-button toc toc-link toc-number toc-title \
         search search-input search-results search-note search-hit \
         content chapter chapter-title chapter-nav chapter-nav-link \
         rail rail-inner rail-title rail-list rail-link \
         heading heading-anchor paragraph list list-item steps steps-number steps-text \
         figure figure-caption figure-missing table table-wrap table-header \
         table-cell keys keys-key keys-plus keys-combo keys-text inline-link is-targeted; do
  grep -q "\.$c" src/styles/manual.css || echo "UNSTYLED: .$c"
done
```

Expected: no output. Fix any that print before moving on.

- [ ] **Step 7: Commit**

```bash
cd ~/Projects/manual
git add src/styles
git commit -m "feat: rewrite the stylesheet on layers, tokens and container queries

Every custom property is namespaced --manual-*: the reference's bare
--primary and --text would collide silently with a host page the moment the
shell is embedded.

Colours derive from one oklch brand seed through color-mix, so retheming is
a declaration rather than fourteen hexes, and light-dark() reads the
attribute Manual sets rather than prefers-color-scheme — a product manual
should not flip to dark unasked.

Layout breakpoints are container queries, which also makes the shell work
in a panel and not only full-page. Media queries are left for preferences
and print.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 19: The Vite helper and the real build

**Files:**
- Create: `src/vite/index.ts`, `src/styles/index.ts`
- Modify: `vite.config.ts` (add the stylesheet to the build inputs)
- Test: `src/vite/index.test.ts`, `src/build.test.ts`
- Reference: `~/Projects/evrika-cashier-desktop/manual/vite.config.ts`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: `function manualViteConfig(options?: { outDir?: string; singleFile?: boolean }): UserConfig`, and a `dist/` that actually builds.

This is the first task where `npm run build` must pass end to end — Task 1 deliberately left two entries dangling. The CLI does not exist yet, so **remove the `'cli/index'` entry from `vite.config.ts` in this task**; Task 20 restores it along with the file. A stub entry point that ships is a broken export.

- [ ] **Step 1: Write the failing test**

Create `src/vite/index.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { manualViteConfig } from './index';

describe('manualViteConfig', () => {
  it('builds relative, so the artifact works from any subpath or from file://', () => {
    expect(manualViteConfig().base).toBe('./');
  });

  it('inlines assets, so the single file stays portable', () => {
    expect(manualViteConfig().build?.assetsInlineLimit).toBeGreaterThan(10_000_000);
  });

  it('disables publicDir, since content is imported rather than copied', () => {
    expect(manualViteConfig().publicDir).toBe(false);
  });

  it('defaults to dist and accepts another outDir', () => {
    expect(manualViteConfig().build?.outDir).toBe('dist');
    expect(manualViteConfig({ outDir: 'build' }).build?.outDir).toBe('build');
  });

  it('includes the single-file plugin by default and drops it on request', () => {
    const names = (config: ReturnType<typeof manualViteConfig>) =>
      (config.plugins ?? []).flat().map((plugin) => (plugin as { name?: string })?.name);
    expect(names(manualViteConfig())).toContain('vite:singlefile');
    expect(names(manualViteConfig({ singleFile: false }))).not.toContain('vite:singlefile');
  });

  it('includes the react plugin, so a consumer needs no plugin list at all', () => {
    const names = (manualViteConfig().plugins ?? []).flat()
      .map((plugin) => (plugin as { name?: string })?.name).join(' ');
    expect(names).toContain('react');
  });
});
```

Create `src/build.test.ts`:

```ts
import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * Guards the package's shape rather than its behaviour: an `exports` map that
 * points at a file the build does not produce fails only in a consumer's repo,
 * which is the worst place to find out.
 *
 * Run `npm run build` before this suite; it asserts on `dist/`.
 */
const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));

describe('package exports', () => {
  it.each([
    ['dist/index.js'], ['dist/index.d.ts'],
    ['dist/styles.css'], ['dist/vite.js'], ['dist/vite.d.ts'],
  ])('produces %s', (path) => {
    expect(existsSync(new URL(`../${path}`, import.meta.url)), `${path} — run npm run build`).toBe(true);
  });

  it('does not bundle React', () => {
    const bundle = readFileSync(new URL('../dist/index.js', import.meta.url), 'utf8');
    expect(bundle).not.toContain('createContext=function');
    expect(bundle).toMatch(/from\s*["']react["']/);
  });

  it('keeps react and react-dom peer, never dependencies', () => {
    expect(Object.keys(pkg.dependencies ?? {})).not.toContain('react');
    expect(Object.keys(pkg.dependencies ?? {})).not.toContain('react-dom');
    expect(pkg.peerDependencies.react).toBeDefined();
    expect(pkg.peerDependencies['react-dom']).toBeDefined();
  });

  it('ships the stylesheet with every token in it', () => {
    const css = readFileSync(new URL('../dist/styles.css', import.meta.url), 'utf8');
    expect(css).toContain('--manual-brand');
    expect(css).toContain('@layer');
    expect(css).toContain('@container');
  });
});
```

- [ ] **Step 2: Run them to make sure they fail**

Run: `cd ~/Projects/manual && npx vitest run src/vite src/build.test.ts`
Expected: FAIL — no `./index` to resolve, and `dist/` does not exist.

- [ ] **Step 3: Write `src/styles/index.ts`**

```ts
/**
 * The stylesheet's build entry. Importing CSS from here is what makes Vite
 * emit `dist/styles.css`; nothing imports this module at runtime, which is
 * why it exports a marker rather than nothing at all (an empty module is
 * tree-shaken away, and the CSS with it).
 */
import './manual.css';

export const STYLES_INCLUDED = true;
```

- [ ] **Step 4: Write `src/vite/index.ts`**

Port the reference `vite.config.ts`'s options and — importantly — its whole doc comment, which is the clearest statement anywhere of why the build is a single file. It belongs with the helper now.

```ts
import type { UserConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

/**
 * The build config a manual wants, so each one's `vite.config.ts` is five
 * lines rather than thirty.
 *
 * The build is deliberately a single self-contained `dist/index.html`.
 *
 * A page opened over `file://` cannot `fetch()` its own JSON — the origin is
 * opaque in both WebView2 and WKWebView — so a normal multi-file build would
 * render an empty manual anywhere it is opened from disk. Everything (chapter
 * JSON included, via the eager glob the consumer passes as `config.chapters`)
 * is imported statically and inlined here instead.
 *
 * `assetsInlineLimit` is raised for the same reason: media becomes data URIs so
 * the one file stays portable. If a manual grows heavy screenshots and the HTML
 * gets unwieldy, pass `singleFile: false` and ship `dist/assets/` alongside —
 * but then the offline copy is a folder, not a file.
 */
export function manualViteConfig(
  options: { outDir?: string; singleFile?: boolean } = {},
): UserConfig {
  const { outDir = 'dist', singleFile = true } = options;

  return {
    base: './',
    publicDir: false,
    build: {
      outDir,
      emptyOutDir: true,
      assetsInlineLimit: 100_000_000,
      chunkSizeWarningLimit: 10_000,
    },
    plugins: singleFile ? [react(), viteSingleFile()] : [react()],
  };
}
```

`vite`, `@vitejs/plugin-react` and `vite-plugin-singlefile` must move from `devDependencies` to `peerDependencies` (`vite: '>=5'`, the other two `>=4` and `>=2`) — a consumer importing this helper needs them resolvable in their own tree. Keep them in `devDependencies` as well, and add all three to `rollupOptions.external`.

- [ ] **Step 5: Wire the stylesheet into the build**

In `vite.config.ts`, add `styles: resolve(__dirname, 'src/styles/index.ts')` to `build.lib.entry` and **remove** the `'cli/index'` entry for now. Confirm `output.assetFileNames: 'styles.css'` still names the emitted CSS.

- [ ] **Step 6: Build and run the tests**

Run: `cd ~/Projects/manual && npm run build && npx vitest run src/vite src/build.test.ts`
Expected: build succeeds; PASS, 6 + 8 tests.

- [ ] **Step 7: Run everything**

Run: `cd ~/Projects/manual && npm run typecheck && npx vitest run`
Expected: all green.

- [ ] **Step 8: Commit**

```bash
cd ~/Projects/manual
git add src/vite src/styles/index.ts src/build.test.ts vite.config.ts package.json package-lock.json
git commit -m "feat: export the build helper and make the package actually build

manualViteConfig carries the single-file rationale with it: a manual opened
over file:// cannot fetch its own JSON, so every chapter and every asset has
to be inlined. Each consumer's vite.config.ts drops to five lines.

build.test.ts guards the exports map against pointing at files the build
does not emit — a mismatch that otherwise surfaces first in a consumer repo.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 20: CLI — schema generation and content validation

**Files:**
- Create: `src/cli/index.ts`, `src/cli/schema.ts`, `src/cli/validate.ts`, `src/cli/messages.ts`
- Modify: `vite.config.ts` (restore the `cli/index` entry)
- Test: `src/cli/schema.test.ts`, `src/cli/validate.test.ts`, and fixtures under `src/cli/__fixtures__/`
- Reference: `~/Projects/evrika-cashier-desktop/manual/scripts/validate-content.ts` (the whole check set), `~/Projects/evrika-cashier-desktop/manual/content/schema.json` (the root definitions)

**Interfaces:**
- Consumes: `BlockRegistry`, `builtinBlocks`, `createRegistry` (Tasks 3, 10).
- Produces:
  - `function buildSchema(registry: BlockRegistry): JsonSchema` — root `definitions` plus one `oneOf` branch per registered block
  - `function validateContent(options: { contentDir: string; registry?: BlockRegistry }): string[]` — the error list, empty when clean
  - `src/cli/index.ts` — an executable dispatching `validate`, `schema`, `new-manual`

Ports every check the reference validator does, and adds one the open vocabulary needs: a block type absent from the registry. That check is what replaces the `never` exhaustiveness guard lost with the closed union.

The reference emits Russian messages. Keep them Russian — the people who run `npm run validate` are the ones writing the content. Centralise them in `messages.ts` so they are not scattered through the logic.

- [ ] **Step 1: Write the failing test for `buildSchema`**

Create `src/cli/schema.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import Ajv from 'ajv';
import { buildSchema } from './schema';
import { createRegistry, defineBlock } from '../blocks/registry';
import { builtinBlocks, defaultRegistry } from '../blocks/builtin';
import type { BlockBase } from '../content/types';

const compile = (schema: object) => new Ajv({ allErrors: true, strict: false }).compile(schema);

describe('buildSchema', () => {
  const schema = buildSchema(defaultRegistry);
  const validate = compile(schema);

  it('supplies the shared definitions the fragments $ref', () => {
    const definitions = schema.definitions as Record<string, unknown>;
    expect(definitions.anchor).toBeDefined();
    expect(definitions.nonEmptyText).toBeDefined();
    expect(definitions.stringList).toBeDefined();
    expect(definitions.block).toBeDefined();
  });

  it('has one oneOf branch per registered block type', () => {
    const block = (schema.definitions as { block: { oneOf: unknown[] } }).block;
    expect(block.oneOf).toHaveLength(defaultRegistry.types().length);
  });

  it('accepts a valid chapter', () => {
    expect(validate({
      id: 'payment', title: 'Оплата',
      blocks: [
        { type: 'heading', level: 2, id: 'qr', text: 'Kaspi QR' },
        { type: 'paragraph', text: 'тело' },
        { type: 'keys', combo: ['Ctrl', 'P'], text: 'печать' },
        { type: 'table', headers: ['A'], rows: [['1']] },
      ],
    })).toBe(true);
  });

  it('rejects a chapter missing its title', () => {
    expect(validate({ id: 'a', blocks: [] })).toBe(false);
  });

  it('rejects an unknown block type', () => {
    expect(validate({ id: 'a', title: 'A', blocks: [{ type: 'nope' }] })).toBe(false);
  });

  it('rejects a heading without an anchor id', () => {
    expect(validate({ id: 'a', title: 'A', blocks: [{ type: 'heading', level: 2, text: 'T' }] })).toBe(false);
  });

  it('rejects an anchor that is not a slug', () => {
    expect(validate({
      id: 'a', title: 'A',
      blocks: [{ type: 'heading', level: 2, id: 'Not A Slug', text: 'T' }],
    })).toBe(false);
  });

  it('rejects a heading level the renderer cannot render', () => {
    expect(validate({
      id: 'a', title: 'A',
      blocks: [{ type: 'heading', level: 4, id: 'x', text: 'T' }],
    })).toBe(false);
  });

  it('rejects a property no block declares', () => {
    expect(validate({
      id: 'a', title: 'A',
      blocks: [{ type: 'paragraph', text: 'т', colour: 'red' }],
    })).toBe(false);
  });

  it('grows a branch for a custom block, so custom content validates', () => {
    interface NoteBlock extends BlockBase { type: 'note'; text: string }
    const noteBlock = defineBlock<NoteBlock>({
      type: 'note',
      component: () => null,
      searchText: (block) => block.text,
      schema: {
        required: ['type', 'text'],
        additionalProperties: false,
        properties: { type: { const: 'note' }, text: { $ref: '#/definitions/nonEmptyText' } },
      },
    });
    const custom = compile(buildSchema(createRegistry([...builtinBlocks, noteBlock])));
    expect(custom({ id: 'a', title: 'A', blocks: [{ type: 'note', text: 'своё' }] })).toBe(true);
    expect(custom({ id: 'a', title: 'A', blocks: [{ type: 'note' }] })).toBe(false);
  });
});
```

- [ ] **Step 2: Run it to make sure it fails**

Run: `cd ~/Projects/manual && npx vitest run src/cli/schema.test.ts`
Expected: FAIL — `Failed to resolve import './schema'`.

- [ ] **Step 3: Write `src/cli/schema.ts`**

```ts
import type { BlockRegistry } from '../blocks/registry';
import type { JsonSchema } from '../blocks/registry';

/**
 * The chapter schema, assembled from the registry.
 *
 * Generated rather than hand-maintained: the reference implementation kept
 * `content/schema.json` in the repo beside a renderer switch and a search
 * switch, and nothing checked the three agreed. Deriving it from the specs is
 * what makes disagreement impossible rather than merely unlikely.
 */
export function buildSchema(registry: BlockRegistry, id = 'https://evrika.com/manual/schema.json'): JsonSchema {
  return {
    $schema: 'http://json-schema.org/draft-07/schema#',
    $id: id,
    title: 'Глава руководства',
    type: 'object',
    required: ['id', 'title', 'blocks'],
    additionalProperties: false,
    properties: {
      id: { type: 'string', pattern: '^[a-z0-9-]+$' },
      title: { type: 'string', minLength: 1 },
      blocks: { type: 'array', items: { $ref: '#/definitions/block' } },
    },
    definitions: {
      anchor: { type: 'string', pattern: '^[a-z0-9-]+$' },
      nonEmptyText: { type: 'string', minLength: 1 },
      stringList: { type: 'array', minItems: 1, items: { $ref: '#/definitions/nonEmptyText' } },
      block: {
        type: 'object',
        required: ['type'],
        oneOf: registry.specs().map((spec) => spec.schema),
      },
    },
  };
}
```

- [ ] **Step 4: Run the schema tests**

Run: `cd ~/Projects/manual && npx vitest run src/cli/schema.test.ts`
Expected: PASS, 10 tests. If a branch fails, the spec's `schema` fragment is wrong — fix the fragment in `src/blocks/builtin/`, not the test.

- [ ] **Step 5: Write the fixtures**

Create three content trees under `src/cli/__fixtures__/`:

`clean/` — `manifest.json` with locales `['ru','kk']` and two chapters, both present in both locales with identical block sequences and anchors, one `media/ok.svg` referenced by an image block and present on disk.

`broken/` — one of each error the validator must catch, so every branch has a case:
- a chapter file declared in the manifest but absent from `kk/`
- a chapter whose `id` disagrees with its manifest entry
- a duplicated anchor within one chapter
- an `image` whose `src` is not in `media/`
- an orphaned `media/unused.svg` that no chapter shows
- a link `[x](#ghost)` to an anchor that does not exist
- a link `[x](#ghost-chapter/anchor)` to a chapter that does not exist
- a `kk` chapter with one block fewer than its `ru` counterpart
- a `kk` chapter whose block #1 is a different `type` from `ru`'s
- a block of type `unregistered-type`
- a chapter that violates the schema outright (a `heading` with no `id`)

`custom/` — a clean tree whose content uses a `note` block, for the registry-extension test.

- [ ] **Step 6: Write the failing test for `validateContent`**

Create `src/cli/validate.test.ts`:

```ts
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { validateContent } from './validate';
import { createRegistry, defineBlock } from '../blocks/registry';
import { builtinBlocks } from '../blocks/builtin';
import type { BlockBase } from '../content/types';

const fixture = (name: string) =>
  fileURLToPath(new URL(`./__fixtures__/${name}`, import.meta.url));

const errorsFor = (name: string) => validateContent({ contentDir: fixture(name) });

describe('validateContent on a clean tree', () => {
  it('reports nothing', () => {
    expect(errorsFor('clean')).toEqual([]);
  });
});

describe('validateContent on a broken tree', () => {
  const errors = errorsFor('broken').join('\n');

  it.each([
    ['a chapter file the manifest promises', /файла нет/],
    ['a chapter id that disagrees with the manifest', /не совпадает с manifest/],
    ['a duplicated anchor', /повторяется/],
    ['media a chapter names but does not have', /нет в content\/media/],
    ['media nobody shows', /его никто не показывает/],
    ['a link to a missing anchor', /нет якоря/],
    ['a link to a missing chapter', /несуществующую главу/],
    ['a locale with a different block count', /блоков/],
    ['a locale with a different block type', /в ru — /],
    ['a block type no spec renders', /неизвестный тип блока/],
    ['a chapter that breaks the schema', /schema|схем/i],
  ])('catches %s', (_label, pattern) => {
    expect(errors).toMatch(pattern);
  });

  it('finds every one of them in a single pass, not just the first', () => {
    expect(errorsFor('broken').length).toBeGreaterThanOrEqual(11);
  });
});

describe('validateContent with a custom registry', () => {
  interface NoteBlock extends BlockBase { type: 'note'; text: string }
  const noteBlock = defineBlock<NoteBlock>({
    type: 'note',
    component: () => null,
    searchText: (block) => block.text,
    schema: {
      required: ['type', 'text'],
      additionalProperties: false,
      properties: { type: { const: 'note' }, text: { $ref: '#/definitions/nonEmptyText' } },
    },
  });

  it('accepts content using a registered custom block', () => {
    expect(validateContent({
      contentDir: fixture('custom'),
      registry: createRegistry([...builtinBlocks, noteBlock]),
    })).toEqual([]);
  });

  it('rejects the same content under the default registry', () => {
    expect(errorsFor('custom').join('\n')).toMatch(/note/);
  });
});
```

- [ ] **Step 7: Write `src/cli/messages.ts` and `src/cli/validate.ts`**

Port the reference validator's logic wholesale — it is thorough and its comments explain each check's motivation (why an orphaned media file is worse than a missing one; why an unresolved link is worse than a dead link; why parity is structural rather than "the file exists"). Changes:

1. It is a function taking `{ contentDir, registry }` and **returning** the error list, rather than a script that reads `import.meta.url` and calls `process.exit`. The exit code moves to `index.ts`. That is what makes it testable.
2. The schema comes from `buildSchema(registry ?? defaultRegistry)`, not from `content/schema.json` on disk.
3. A new check, before the schema check so its message is the clearer one: for every block, `registry.has(block.type)` or fail with `неизвестный тип блока «{type}» — его не рисует ни один spec`.
3a. A second new check: every manifest `file` must be a bare filename, failing with
   `{file}: имя файла главы не должно содержать «/» — путь ломает сопоставление локалей`.
   `createContentSource` keys modules by their trailing `<locale>/<file>`, so a `file` naming a
   subdirectory loses its locale segment and the chapter reads as untranslated in every locale —
   a deceptive failure that belongs here, where the message can name the cause.
   Add a fixture case for it in `broken/` and a row to the `it.each` table in `validate.test.ts`.
4. Messages move to `messages.ts` as functions (`missingFile(locale, file)`, `unknownBlockType(locale, chapterId, type)`, …). Keep the exact Russian wording of the reference's existing messages — people know these strings.
5. `readdirSync(mediaDir)` must tolerate an absent `media/` directory: a manual with no media is valid. Guard with `existsSync`.

- [ ] **Step 8: Write `src/cli/index.ts`**

```ts
#!/usr/bin/env node
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { argv, cwd, exit } from 'node:process';
import { buildSchema } from './schema';
import { validateContent } from './validate';
import { defaultRegistry } from '../blocks/builtin';
import { scaffold } from './scaffold';

const [command, ...rest] = argv.slice(2);

/**
 * The content dir defaults to `./content`, which is where both manuals keep
 * it. A custom registry cannot be passed on the command line — a consumer with
 * custom blocks imports `validateContent` from a small script of their own, and
 * the README shows that.
 */
const contentDir = rest.find((arg) => !arg.startsWith('-')) ?? join(cwd(), 'content');

switch (command) {
  case 'validate': {
    const errors = validateContent({ contentDir });
    if (errors.length > 0) {
      console.error(`Контент не прошёл проверку (${errors.length}):\n`);
      for (const error of errors) console.error(`  • ${error}`);
      exit(1);
    }
    console.log('Контент в порядке.');
    break;
  }
  case 'schema': {
    const path = join(contentDir, 'schema.json');
    writeFileSync(path, `${JSON.stringify(buildSchema(defaultRegistry), null, 2)}\n`);
    console.log(`Схема записана: ${path}`);
    break;
  }
  case 'new-manual': {
    if (!rest[0]) {
      console.error('manual-kit new-manual <dir>');
      exit(1);
    }
    scaffold(rest[0]);
    break;
  }
  default:
    console.error('manual-kit <validate | schema | new-manual>');
    exit(1);
}
```

**Omit the `new-manual` case and the `scaffold` import in this task.** Write the `switch` with `validate`, `schema` and the default; Task 21 adds the third case together with `scaffold.ts` itself. Stubbing it here would mean either an empty function that ships or an import of a file that does not exist.

- [ ] **Step 9: Restore the CLI build entry and verify**

Add `'cli/index': resolve(__dirname, 'src/cli/index.ts')` back to `build.lib.entry`.

Run:
```bash
cd ~/Projects/manual
npx vitest run src/cli && npm run build && npm run typecheck
node dist/cli/index.js validate src/cli/__fixtures__/clean   # exit 0
node dist/cli/index.js validate src/cli/__fixtures__/broken; echo "exit=$?"  # exit 1
```
Expected: tests PASS; build succeeds; the clean tree exits 0 with «Контент в порядке.»; the broken tree exits 1 and lists at least eleven errors.

- [ ] **Step 10: Commit**

```bash
cd ~/Projects/manual
git add src/cli vite.config.ts
git commit -m "feat: add the manual-kit CLI, with a generated schema

The schema is derived from the registry, so it cannot disagree with the
renderer — the reference kept it as a hand-maintained JSON file beside two
switches, and nothing checked the three agreed.

Validation ports every check from scripts/validate-content.ts and adds the
one the open vocabulary needs: a block type no spec renders. That check is
what replaces the never-exhaustiveness guard lost with the closed union.

The validator returns its errors instead of calling process.exit, which is
what makes it testable; a fixture tree covers all eleven failure branches.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 21: CLI — scaffolding a new manual

**Files:**
- Create: `src/cli/scaffold.ts`
- Modify: `src/cli/index.ts` — add the `new-manual` case and the `scaffold` import Task 20 deliberately left out
- Test: `src/cli/scaffold.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `function scaffold(dir: string): string[]` — the list of paths written.

The payoff test for the whole package: what a new manual actually costs.

- [ ] **Step 1: Write the failing test**

Create `src/cli/scaffold.test.ts`:

```ts
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { scaffold } from './scaffold';

let dir = '';
beforeEach(() => { dir = mkdtempSync(join(tmpdir(), 'manual-kit-')); });
afterEach(() => rmSync(dir, { recursive: true, force: true }));

describe('scaffold', () => {
  it('writes a manual that needs only content', () => {
    const written = scaffold(dir).map((path) => path.replace(`${dir}/`, ''));
    expect(written.sort()).toEqual([
      'content/kk/01-getting-started.json',
      'content/manifest.json',
      'content/ru/01-getting-started.json',
      'index.html',
      'package.json',
      'src/main.tsx',
      'src/theme.css',
      'vite.config.ts',
    ]);
  });

  it('keeps main.tsx under thirty lines — the whole point of the package', () => {
    scaffold(dir);
    const main = readFileSync(join(dir, 'src/main.tsx'), 'utf8');
    expect(main.split('\n').filter((line) => line.trim()).length).toBeLessThan(30);
    expect(main).toContain('renderManual');
    expect(main).toContain("import.meta.glob('../content/*/*.json'");
    expect(main).toContain("import.meta.glob('../content/media/*'");
  });

  it('writes a vite.config.ts that just spends the helper', () => {
    scaffold(dir);
    const config = readFileSync(join(dir, 'vite.config.ts'), 'utf8');
    expect(config).toContain('manualViteConfig');
    expect(config.split('\n').filter((line) => line.trim()).length).toBeLessThan(8);
  });

  it('writes a theme.css that overrides tokens unlayered, with no !important', () => {
    scaffold(dir);
    const theme = readFileSync(join(dir, 'src/theme.css'), 'utf8');
    expect(theme).toContain('--manual-brand');
    expect(theme).not.toContain('!important');
    expect(theme).not.toContain('@layer');
  });

  it('writes a manifest and a first chapter in both locales', () => {
    scaffold(dir);
    const manifest = JSON.parse(readFileSync(join(dir, 'content/manifest.json'), 'utf8'));
    expect(manifest.locales).toEqual(['ru', 'kk']);
    expect(manifest.chapters).toHaveLength(1);
    for (const locale of ['ru', 'kk']) {
      const chapter = JSON.parse(
        readFileSync(join(dir, `content/${locale}/01-getting-started.json`), 'utf8'),
      );
      expect(chapter.id).toBe('getting-started');
      expect(chapter.blocks.length).toBeGreaterThan(0);
    }
  });

  it('wires validate and schema into the package scripts', () => {
    scaffold(dir);
    const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'));
    expect(pkg.scripts.validate).toBe('manual-kit validate');
    expect(pkg.scripts.schema).toBe('manual-kit schema');
    expect(pkg.dependencies['@evrika/manual-kit']).toBeDefined();
  });

  it('refuses to overwrite a directory that already has a manual', () => {
    scaffold(dir);
    expect(() => scaffold(dir)).toThrow(/already/i);
  });
});
```

- [ ] **Step 2: Run it to make sure it fails**

Run: `cd ~/Projects/manual && npx vitest run src/cli/scaffold.test.ts`
Expected: FAIL — `Failed to resolve import './scaffold'`.

- [ ] **Step 3: Write `src/cli/scaffold.ts`**

Templates as exported string constants in the same file (no separate `templates/` directory unless one grows past ~40 lines — `writeFileSync` of a template literal is simpler than a copy step that has to be taught about the bundler). It must `throw` rather than overwrite when `content/manifest.json` already exists. The `main.tsx` template is exactly the consumer surface from the spec, media glob included. The scaffolded content must pass `manual-kit validate` as written.

- [ ] **Step 4: Run the tests, then check the scaffold end to end**

```bash
cd ~/Projects/manual
npx vitest run src/cli/scaffold.test.ts
rm -rf /tmp/scaffold-check && mkdir -p /tmp/scaffold-check
node -e "import('./dist/cli/index.js')" 2>/dev/null || npm run build
node dist/cli/index.js new-manual /tmp/scaffold-check
node dist/cli/index.js validate /tmp/scaffold-check/content; echo "exit=$?"
```
Expected: tests PASS, 7 tests; the scaffolded tree validates clean at exit 0.

- [ ] **Step 5: Commit**

```bash
cd ~/Projects/manual
git add src/cli/scaffold.ts src/cli/scaffold.test.ts
git commit -m "feat: scaffold a new manual from the CLI

A test asserts the generated main.tsx stays under thirty lines and the
vite.config.ts under eight: that ratio is the package's whole claim, so it
is worth a failing build when it stops being true.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 22: The example manual

**Files:**
- Create: `example/index.html`, `example/vite.config.ts`, `example/src/main.tsx`, `example/src/theme.css`, `example/src/blocks/shortcut.tsx`, `example/content/**`
- Test: `example/example.test.tsx`

**Interfaces:**
- Consumes: the whole public API, through the package's own source (alias `@evrika/manual-kit` → `src/index.ts` in `example/vite.config.ts`, so the example tracks the source rather than the last build).
- Produces: a runnable manual (`npm run example`) that is also the integration fixture.

Because migration is deferred, this is what proves the abstraction. It must not be a hello-world. It needs, deliberately:
- **three locales** — `ru`, `kk`, and `en` — where `en` is a locale the library bundles nothing for, so the config path for an unknown locale is exercised by something real;
- **a translation gap** — one chapter absent from `kk`, so the fallback notice renders on a real page;
- **a custom block** — `shortcut`, registered by the example, proving the registry's extension path end to end: rendered, searchable, and schema-validated;
- **every built-in block type** used at least once, so the stylesheet is visually checkable in one pass.

- [ ] **Step 1: Write the failing test**

Create `example/example.test.tsx`:

```tsx
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Manual, resolveConfig, buildEntries, search } from '../src/index';
import { exampleConfig } from './src/config';

// `exampleConfig()` deliberately omits `root`: there is no #root in jsdom, and
// the browser entry is the only caller that has one.
const config = () =>
  resolveConfig({ ...exampleConfig(), root: document.createElement('div'), routing: 'memory' });

describe('the example manual', () => {
  it('resolves its config, including the locale the library knows nothing about', () => {
    const resolved = config();
    expect(resolved.locales.list).toEqual(['ru', 'kk', 'en']);
    expect(resolved.locales.labels.en).toBe('English');
    expect(resolved.locales.strings.en.onThisPage).toBe('On this page');
  });

  it('registers the custom block alongside the nine built-ins', () => {
    expect(config().registry.types()).toContain('shortcut');
    expect(config().registry.types()).toHaveLength(10);
  });

  it('renders its first chapter', () => {
    render(<Manual config={config()} />);
    expect(screen.getByRole('heading', { level: 1 })).toBeDefined();
  });

  it('renders the custom block where content uses it', () => {
    render(<Manual config={config()} />);
    expect(document.querySelector('.shortcut')).not.toBeNull();
  });

  it('finds the custom block by its text, so registry search works end to end', () => {
    const resolved = config();
    const entries = buildEntries(resolved.content.allChapters('ru'), resolved.registry);
    const hits = search(entries, 'ярлык', { minQueryLength: 2, maxResults: 30 });
    expect(hits.length).toBeGreaterThan(0);
  });

  it('shows the fallback notice on the chapter Kazakh does not have', () => {
    const resolved = config();
    const gap = resolved.content.manifest.chapters
      .map((entry) => entry.id)
      .find((id) => resolved.content.loadChapter('kk', id)?.isFallback);
    expect(gap, 'the example must keep one deliberate translation gap').toBeDefined();
  });

  it('uses every built-in block type somewhere, so the stylesheet is checkable', () => {
    const resolved = config();
    const used = new Set(
      resolved.content.allChapters('ru').flatMap((chapter) => chapter.blocks.map((block) => block.type)),
    );
    for (const type of resolved.registry.types()) {
      expect(used.has(type), `no chapter uses "${type}"`).toBe(true);
    }
  });

  it('switches locale from the sidebar', async () => {
    render(<Manual config={config()} />);
    await userEvent.click(screen.getByRole('button', { name: 'English' }));
    expect(screen.getByText('On this page')).toBeDefined();
  });
});
```

Note `exampleConfig()` in `example/src/config.ts` — the config lives apart from `main.tsx` so the test and the browser entry share it rather than duplicating the globs.

- [ ] **Step 2: Run it to make sure it fails**

Run: `cd ~/Projects/manual && npx vitest run example`
Expected: FAIL — `Failed to resolve import './src/config'`.

- [ ] **Step 3: Write the custom block**

`example/src/blocks/shortcut.tsx` — a `shortcut` block with `{ type: 'shortcut'; label: string; text: string }`, its component rendering `.shortcut`, `searchText` returning `` `${block.label} ${block.text}` ``, and a schema fragment in the same shape as the built-ins. Keep it small; its job is to be a real second-party block, not a feature.

- [ ] **Step 4: Write the content**

`example/content/` with `manifest.json` (locales `['ru','kk','en']`, three chapters), and chapter JSON per locale. Chapter 2 is absent from `kk/` on purpose — put a comment saying so in the README, since a missing file cannot carry one. Between them the chapters use all nine built-ins plus `shortcut`, and at least one internal `[label](#anchor)` link of each form (same-chapter and cross-chapter) so the validator's link checks have something to pass on.

- [ ] **Step 5: Write `example/src/config.ts`, `main.tsx`, `theme.css`, `index.html`, `vite.config.ts`**

`config.ts` exports `exampleConfig(): Omit<ManualConfig<'ru'|'kk'|'en', ExampleBlock>, 'root'>` — both globs, the three locales with `en` labels and strings supplied in full, and `blocks: createRegistry([...builtinBlocks, shortcutBlock])`. It omits `root` so the test can supply a detached element; `main.tsx` is `renderManual({ ...exampleConfig(), root: document.getElementById('root')! })` and nothing else.

`theme.css` overrides two or three tokens unlayered (a different brand hue is the clearest demonstration) with a comment noting that it needs no `@layer` and no `!important` because unlayered CSS outranks every layer.

`example/vite.config.ts`:

```ts
import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import { manualViteConfig } from '../src/vite/index';

// The example imports the package by name but resolves to source, so it tracks
// what is being written rather than the last build.
export default defineConfig({
  ...manualViteConfig(),
  root: resolve(__dirname),
  resolve: { alias: { '@evrika/manual-kit': resolve(__dirname, '../src/index.ts') } },
});
```

- [ ] **Step 6: Run the tests and the validator, then look at it**

```bash
cd ~/Projects/manual
npx vitest run example && npm run typecheck
node dist/cli/index.js validate example/content; echo "exit=$?"
npm run example   # then open the printed URL
```
Expected: tests PASS, 8 tests; the example content validates clean — **except** for the `shortcut` block, which the default registry does not know. That is correct: it proves the check works. Add `example/validate.ts` (a three-line script passing the example's registry to `validateContent`) and wire it as `npm run example:validate`, then confirm *that* exits 0.

In the browser, check by eye against the reference manuals: three columns on a wide window, the rail above the text when narrow, the fallback notice on chapter 2 in Kazakh, search finding the custom block, the locale switch, and — resize the window narrow — that the container query reflows the layout.

- [ ] **Step 7: Verify the dark palette renders**

Temporarily set `colorScheme: 'dark'` in `example/src/config.ts`, reload, and check every surface, every callout variant, the table, the `keys` block and the focus rings for contrast. Revert to `'light'` afterwards. Fix any token that reads badly in `src/styles/tokens.css` — this is the only pass the dark palette gets before a consumer opts in.

- [ ] **Step 8: Commit**

```bash
cd ~/Projects/manual
git add example
git commit -m "feat: add the example manual, the proof the abstraction holds

Three locales — one of which the library bundles nothing for — a deliberate
translation gap, a second-party block registered from outside the package,
and every built-in block used at least once so the stylesheet is checkable
in one pass.

Migration is deferred, so this is what stands in for a real consumer. A
test asserts the gap and the full block coverage stay, because both decay
silently.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Task 23: Documentation

**Files:**
- Create: `README.md`, `docs/tokens.md`, `docs/migration.md`
- Test: `src/docs.test.ts`

**Interfaces:**
- Consumes: the finished package.
- Produces: the documentation a consumer needs to adopt the package without reading its source.

Written in Russian, like both reference READMEs — the readers are the same people.

- [ ] **Step 1: Write the failing test**

Documentation rots where it names things. Create `src/docs.test.ts` to pin the parts that can be checked:

```ts
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { defaultRegistry } from './blocks/builtin';
import { UI_STRING_KEYS } from './app/strings';

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const tokens = read('docs/tokens.md');
const readme = read('README.md');
const styles = read('src/styles/tokens.css');

describe('docs/tokens.md', () => {
  it('documents every token the stylesheet declares', () => {
    const declared = [...styles.matchAll(/^\s*(--manual-[a-z0-9-]+):/gm)].map((match) => match[1]!);
    for (const token of new Set(declared)) {
      expect(tokens, token).toContain(token);
    }
  });

  it('documents no token the stylesheet does not declare', () => {
    const documented = [...tokens.matchAll(/`(--manual-[a-z0-9-]+)`/g)].map((match) => match[1]!);
    for (const token of new Set(documented)) {
      expect(styles, token).toContain(`${token}:`);
    }
  });
});

describe('README.md', () => {
  it('documents every block type', () => {
    for (const type of defaultRegistry.types()) {
      expect(readme, type).toContain(`\`${type}\``);
    }
  });

  it('documents every UI string key', () => {
    for (const key of UI_STRING_KEYS) {
      expect(readme, key).toContain(key);
    }
  });

  it('shows the consumer surface with both globs', () => {
    expect(readme).toContain("import.meta.glob('../content/*/*.json'");
    expect(readme).toContain("import.meta.glob('../content/media/*'");
  });

  it('documents all three CLI commands', () => {
    for (const command of ['manual-kit validate', 'manual-kit schema', 'manual-kit new-manual']) {
      expect(readme, command).toContain(command);
    }
  });
});
```

- [ ] **Step 2: Run it to make sure it fails**

Run: `cd ~/Projects/manual && npx vitest run src/docs.test.ts`
Expected: FAIL — `ENOENT`, no `docs/tokens.md`.

- [ ] **Step 3: Write `README.md`**

Sections, in this order:

1. **Что это** — one paragraph: the shell both manuals share, extracted. Name both consumers.
2. **Быстрый старт** — `manual-kit new-manual`, then `npm install`, `npm run dev`.
3. **Конфигурация** — the full `ManualConfig` table: every field, its type, its default, one sentence on when to set it. This is the reference a consumer actually reads.
4. **Контент** — the chapter format, the `manifest.json` shape, the two inline forms (`**bold**`, `[label](#anchor)` in both its target forms), and the table of all ten block types with their fields. State plainly that `text` carries no HTML and no Markdown, and that anything richer is a new block type.
5. **Свои блоки** — `defineBlock` + `createRegistry([...builtinBlocks, mine])`, with the example's `shortcut` as the worked case, and the note that replacing a built-in means filtering it out rather than registering over it.
6. **Локали** — how to add a third, what has to be supplied (label + all twelve strings, listed), and how partial string overrides merge.
7. **Темизация** — point at `docs/tokens.md`; explain in two sentences why an unlayered `theme.css` wins the cascade and needs no `!important`; show a brand override; explain `colorScheme`.
8. **Сборка и выкладка** — `manualViteConfig()`, why the build is a single file, and that Firebase hosting config stays per app (with each app's existing `target` arrangement named, since that trips people up).
9. **CLI** — all three commands, and how to pass a custom registry to `validateContent` from a small script.
10. **Разработка пакета** — `npm test`, `npm run example`, `npm run build`.
11. **Миграция существующих руководств** — a pointer to `docs/migration.md`.

- [ ] **Step 4: Write `docs/tokens.md`**

A table per group — colour, typography, spacing, layout, radius, breakpoints — with each token's name, default, and what it affects. Head it with the one rule that matters: override in your own stylesheet, unlayered, and it wins. Note explicitly which tokens are `@property`-typed and therefore fall back to their initial value rather than breaking the layout when given nonsense.

- [ ] **Step 5: Write `docs/migration.md`**

The per-app recipe from the spec, as an ordered checklist a person can follow in one sitting:

1. `npm i @evrika/manual-kit@<version>` (exact, not a range — the API is 0.x).
2. Delete `src/` except `main.tsx`; write the new one (show it).
3. Move the `:root` block from the old `styles.css` into `theme.css`, renaming each variable to its `--manual-*` equivalent (give the full old→new mapping table — this is the fiddliest step and the one most likely to be done wrong).
4. Replace `vite.config.ts` with the helper (show it).
5. Delete `scripts/validate-content.ts`; point the `validate` script at `manual-kit validate`.
6. Regenerate `content/schema.json` with `manual-kit schema`.
7. For the cashier manual: nothing else — `keys` is a built-in.
8. For the courier manual: set `brand: 'EG Delivery'`, which fixes the `Evrika Cashier` string it currently ships (`src/app/Sidebar.tsx:47`).
9. Keep `content/`, `content/media/`, `index.html`, `firebase.json`, `.firebaserc` untouched.
10. Verify: `npm run validate`, `npm run build`, then open `dist/index.html` **over `file://`** — that is the case the single-file build exists for and the one a dev server never exercises.

- [ ] **Step 6: Run the tests and the full suite**

Run: `cd ~/Projects/manual && npx vitest run && npm run typecheck && npm run build`
Expected: every suite PASS; typecheck clean; build succeeds.

- [ ] **Step 7: Final verification pass**

```bash
cd ~/Projects/manual
# No hardcoded user-visible Cyrillic outside the three sanctioned places. Comment lines are
# stripped first: a comment quoting the string it replaced is documentation, not a hardcoded
# string, and MissingMedia.tsx legitimately contains one.
for f in $(grep -rl '[А-Яа-яӘәҚқҢңӨөҰұҮүҺһІі]' src --include='*.ts' --include='*.tsx' \
  | grep -v -e 'app/strings.ts' -e 'content/builtins.ts' -e 'cli/' -e '\.test\.' -e '__fixtures__'); do
  sed -e 's|//.*||' -e '/^\s*\*/d' -e '/^\s*\/\*/d' "$f" \
    | grep -q '[А-Яа-яӘәҚқҢңӨөҰұҮүҺһІі]' && echo "CYRILLIC STRING LITERAL: $f"
done
# No locale hardcoded outside the two files allowed to know about ru/kk.
grep -rn "'ru'\|'kk'" src --include='*.ts' --include='*.tsx' \
  | grep -v -e 'content/builtins.ts' -e 'app/strings.ts' -e '\.test\.' -e '__fixtures__'
# No bare custom property in the stylesheet.
grep -n '^\s*--[a-z]' src/styles/*.css | grep -v -- '--manual-'
```

Expected: all three print nothing. Each maps to a Global Constraint; fix any hit before finishing.

- [ ] **Step 8: Commit**

```bash
cd ~/Projects/manual
git add README.md docs/tokens.md docs/migration.md src/docs.test.ts
git commit -m "docs: document the config surface, the tokens and the migration

docs.test.ts pins the parts that rot: every token declared is documented and
vice versa, every block type and every UI string key is named in the README.

The migration guide carries the full old→new token mapping, which is the
fiddliest step of adopting this in either app, and ends by insisting the
built file be opened over file:// — the case the single-file build exists
for and the one a dev server never exercises.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Publishing

Nothing here publishes the package, and nothing needs to: both consumers
migrate in the follow-up, and the example resolves `@evrika/manual-kit` to
source through a Vite alias.

One consequence to know before Task 21: a tree produced by
`manual-kit new-manual` names `@evrika/manual-kit` as a dependency, so
`npm install` in it cannot succeed until the package is published or linked.
That is expected at 0.1.0. Verify a scaffolded tree with `npm link`, or by
running the CLI against it from this repo as Task 21 Step 4 does.

## Done when

- `npm test` green, `npm run typecheck` clean, `npm run build` produces every file the `exports` map names.
- `npm run example` serves a three-locale manual with a custom block, a translation gap, and all ten block types.
- `manual-kit new-manual` produces a manual whose `main.tsx` is under thirty lines and whose content validates clean.
- The three greps in Task 23 Step 7 print nothing.
- `docs/migration.md` is followable without reading the package source.

Neither app repository has been touched. Migration is the follow-up, and `docs/migration.md` is its plan.
