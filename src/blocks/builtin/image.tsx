import type { ImageBlock } from '../../content/types';
import { defineBlock, type BlockProps } from '../registry';
import { useManual } from '../../app/context';
import { MissingMedia } from './MissingMedia';

/**
 * Media resolved through Vite's asset pipeline, so the build inlines it into
 * the single file (see `assetsInlineLimit` in `vite.config.ts`).
 *
 * Content writes a stable `media/shift-open.png`; the glob that turns that
 * into whatever URL the bundler produced now runs in the consumer's
 * `main.tsx` and arrives here as `config.media`, read through
 * `useManual().resolveMedia`. Media is locale-neutral — a locale only differs
 * if its own chapter names a different `src`.
 */
function Image({ block }: BlockProps<ImageBlock>) {
  const { resolveMedia } = useManual();
  const url = resolveMedia(block.src);

  if (!url) return <MissingMedia src={block.src} />;

  return (
    <figure className="figure">
      <img className="figure-image" src={url} alt={block.alt} loading="lazy" />
      {block.caption && (
        <figcaption className="figure-caption">{block.caption}</figcaption>
      )}
    </figure>
  );
}

export const imageBlock = defineBlock<ImageBlock>({
  type: 'image',
  component: Image,
  searchText: (block) => block.caption ?? null,
  schema: {
    required: ['type', 'src', 'alt'],
    additionalProperties: false,
    properties: {
      type: { const: 'image' },
      id: { $ref: '#/definitions/anchor' },
      src: { type: 'string', pattern: '^media/' },
      alt: { $ref: '#/definitions/nonEmptyText' },
      caption: { $ref: '#/definitions/nonEmptyText' },
    },
  },
});
