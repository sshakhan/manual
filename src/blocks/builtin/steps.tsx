import type { StepsBlock } from '../../content/types';
import { defineBlock, type BlockProps } from '../registry';
import { inline } from '../inline';

/**
 * `steps` is not `list` with `ordered: true`: a numbered list is prose, a step
 * list is an instruction a cashier follows at the till, and it is styled as
 * numbered cards. Keeping them apart means the styling can diverge without
 * rewriting content.
 */
function Steps({ block, resolveAnchor }: BlockProps<StepsBlock>) {
  return (
    <ol id={block.id} className="steps">
      {block.items.map((item, index) => (
        <li key={index} className="steps-item">
          <span className="steps-number">{index + 1}</span>
          <span className="steps-text">{inline(item, resolveAnchor)}</span>
        </li>
      ))}
    </ol>
  );
}

export const stepsBlock = defineBlock<StepsBlock>({
  type: 'steps',
  component: Steps,
  searchText: (block) => block.items.join(' '),
  schema: {
    required: ['type', 'items'],
    additionalProperties: false,
    properties: {
      type: { const: 'steps' },
      id: { $ref: '#/definitions/anchor' },
      items: { $ref: '#/definitions/stringList' },
    },
  },
});
