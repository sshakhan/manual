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
