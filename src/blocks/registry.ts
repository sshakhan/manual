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
