import type { CalloutBlock } from '../../content/types';
import { defineBlock, type BlockProps } from '../registry';
import { inline } from '../inline';

/**
 * `<aside>` rather than `<div>`: a callout is tangential to the surrounding
 * prose, and the variant class carries all the styling — info, warning,
 * danger and success are colour, not structure.
 *
 * `callout`, not `notice`: the two are different things and the stylesheet
 * treats them as such. `.callout` is authored content and has all four
 * variants; `.notice` is the shell's own message chrome (the fallback and
 * chapter-missing messages in `ChapterView`) and only has `.notice-info` and
 * `.notice-warning`. A callout rendered under `.notice-danger` or
 * `.notice-success` would silently lose its colour, since those rules do not
 * exist.
 */
function Callout({ block, resolveAnchor }: BlockProps<CalloutBlock>) {
  return (
    <aside id={block.id} className={`callout callout-${block.variant}`}>
      {inline(block.text, resolveAnchor)}
    </aside>
  );
}

export const calloutBlock = defineBlock<CalloutBlock>({
  type: 'callout',
  component: Callout,
  searchText: (block) => block.text,
  schema: {
    required: ['type', 'variant', 'text'],
    additionalProperties: false,
    properties: {
      type: { const: 'callout' },
      id: { $ref: '#/definitions/anchor' },
      variant: {
        type: 'string',
        enum: ['info', 'warning', 'danger', 'success'],
      },
      text: { $ref: '#/definitions/nonEmptyText' },
    },
  },
});
