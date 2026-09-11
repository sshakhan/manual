import { Fragment } from 'react';
import type { KeysBlock } from '../../content/types';
import { defineBlock, type BlockProps } from '../registry';

/**
 * The combo renders as literal keys (`Ctrl`, `Shift`, `P`) rather than through
 * `inline`: a key name is not prose and must never be read as Markdown.
 */
function Keys({ block }: BlockProps<KeysBlock>) {
  return (
    <p id={block.id} className="keys">
      <span className="keys-combo">
        {block.combo.map((key, index) => (
          <Fragment key={index}>
            {index > 0 && <span className="keys-plus">+</span>}
            <kbd className="keys-key">{key}</kbd>
          </Fragment>
        ))}
      </span>
      <span className="keys-text">{block.text}</span>
    </p>
  );
}

export const keysBlock = defineBlock<KeysBlock>({
  type: 'keys',
  component: Keys,
  searchText: (block) => `${block.combo.join(' + ')} ${block.text}`,
  schema: {
    required: ['type', 'combo', 'text'],
    additionalProperties: false,
    properties: {
      type: { const: 'keys' },
      id: { $ref: '#/definitions/anchor' },
      combo: { $ref: '#/definitions/stringList' },
      text: { $ref: '#/definitions/nonEmptyText' },
    },
  },
});
