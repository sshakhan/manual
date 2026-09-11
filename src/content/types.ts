/**
 * The block vocabulary. A chapter is a flat array of these — flat rather than a
 * tree so a block can be reordered, translated and indexed without walking a
 * structure.
 *
 * `text` fields carry no HTML and no Markdown. One inline convention only,
 * implemented in `src/blocks/inline.tsx`: `**bold**` and `[label](#anchor)`.
 * Anything richer becomes a new block type instead.
 */

import type { BuiltinLocale } from './builtins';

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

export type CalloutVariant = 'info' | 'warning' | 'danger' | 'success';

export interface HeadingBlock extends BlockBase {
  type: 'heading';
  level: 2 | 3;
  id: string;
  text: string;
}

export interface ParagraphBlock extends BlockBase {
  type: 'paragraph';
  text: string;
}

export interface ListBlock extends BlockBase {
  type: 'list';
  ordered?: boolean;
  items: string[];
}

export interface StepsBlock extends BlockBase {
  type: 'steps';
  items: string[];
}

export interface ImageBlock extends BlockBase {
  type: 'image';
  src: string;
  alt: string;
  caption?: string;
}

export interface VideoBlock extends BlockBase {
  type: 'video';
  src: string;
  poster?: string;
  caption?: string;
}

export interface CalloutBlock extends BlockBase {
  type: 'callout';
  variant: CalloutVariant;
  text: string;
}

export interface TableBlock extends BlockBase {
  type: 'table';
  headers: string[];
  rows: string[][];
}

export interface KeysBlock extends BlockBase {
  type: 'keys';
  combo: string[];
  text: string;
}

export type BuiltinBlock =
  | HeadingBlock | ParagraphBlock | ListBlock | StepsBlock
  | ImageBlock | VideoBlock | CalloutBlock | TableBlock | KeysBlock;
