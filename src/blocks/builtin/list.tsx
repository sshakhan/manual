import type { ListBlock } from '../../content/types';
import { defineBlock, type BlockProps } from '../registry';
import { inline } from '../inline';

function List({ block, resolveAnchor }: BlockProps<ListBlock>) {
  const items = block.items.map((item, index) => (
    <li key={index} className="list-item">
      {inline(item, resolveAnchor)}
    </li>
  ));

  return block.ordered ? (
    <ol id={block.id} className="list list-ordered">
      {items}
    </ol>
  ) : (
    <ul id={block.id} className="list list-bulleted">
      {items}
    </ul>
  );
}

export const listBlock = defineBlock<ListBlock>({
  type: 'list',
  component: List,
  searchText: (block) => block.items.join(' '),
  schema: {
    required: ['type', 'items'],
    additionalProperties: false,
    properties: {
      type: { const: 'list' },
      id: { $ref: '#/definitions/anchor' },
      ordered: { type: 'boolean' },
      items: { $ref: '#/definitions/stringList' },
    },
  },
});
