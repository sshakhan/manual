import type { VideoBlock } from '../../content/types';
import { defineBlock, type BlockProps } from '../registry';
import { useManual } from '../../app/context';
import { MissingMedia } from './MissingMedia';

function Video({ block }: BlockProps<VideoBlock>) {
  const { resolveMedia } = useManual();
  const url = resolveMedia(block.src);
  const poster = block.poster ? resolveMedia(block.poster) : undefined;

  if (!url) return <MissingMedia src={block.src} />;

  return (
    <figure className="figure">
      <video className="figure-image" src={url} poster={poster} controls />
      {block.caption && (
        <figcaption className="figure-caption">{block.caption}</figcaption>
      )}
    </figure>
  );
}

export const videoBlock = defineBlock<VideoBlock>({
  type: 'video',
  component: Video,
  searchText: (block) => block.caption ?? null,
  schema: {
    required: ['type', 'src'],
    additionalProperties: false,
    properties: {
      type: { const: 'video' },
      id: { $ref: '#/definitions/anchor' },
      src: { type: 'string', pattern: '^media/' },
      poster: { type: 'string', pattern: '^media/' },
      caption: { $ref: '#/definitions/nonEmptyText' },
    },
  },
});
