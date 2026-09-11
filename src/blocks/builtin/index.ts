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
