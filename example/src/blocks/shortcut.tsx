import type { BlockBase } from '@evrika/manual-kit';
import { defineBlock, type BlockProps } from '@evrika/manual-kit';

/**
 * A second-party block, registered from outside the package, to prove the
 * registry's extension path end to end — rendered, searchable and schema-
 * validated exactly like a built-in.
 */
export interface ShortcutBlock extends BlockBase {
  type: 'shortcut';
  label: string;
  text: string;
}

function Shortcut({ block }: BlockProps<ShortcutBlock>) {
  return (
    <p id={block.id} className="shortcut">
      <span className="shortcut-label">{block.label}</span>
      <span className="shortcut-text">{block.text}</span>
    </p>
  );
}

export const shortcutBlock = defineBlock<ShortcutBlock>({
  type: 'shortcut',
  component: Shortcut,
  searchText: (block) => `${block.label} ${block.text}`,
  schema: {
    required: ['type', 'label', 'text'],
    additionalProperties: false,
    properties: {
      type: { const: 'shortcut' },
      id: { $ref: '#/definitions/anchor' },
      label: { $ref: '#/definitions/nonEmptyText' },
      text: { $ref: '#/definitions/nonEmptyText' },
    },
  },
});
