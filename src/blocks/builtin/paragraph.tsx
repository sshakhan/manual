import type { ParagraphBlock } from '../../content/types';
import { defineBlock, type BlockProps } from '../registry';
import { inline } from '../inline';

function Paragraph({ block, resolveAnchor }: BlockProps<ParagraphBlock>) {
  return (
    <p id={block.id} className="paragraph">
      {inline(block.text, resolveAnchor)}
    </p>
  );
}

export const paragraphBlock = defineBlock<ParagraphBlock>({
  type: 'paragraph',
  component: Paragraph,
  searchText: (block) => block.text,
  schema: {
    required: ['type', 'text'],
    additionalProperties: false,
    properties: {
      type: { const: 'paragraph' },
      id: { $ref: '#/definitions/anchor' },
      text: { $ref: '#/definitions/nonEmptyText' },
    },
  },
});
