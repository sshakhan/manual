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
