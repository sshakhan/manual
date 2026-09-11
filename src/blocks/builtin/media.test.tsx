import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import type { ReactNode } from 'react';
import { imageBlock } from './image';
import { videoBlock } from './video';
import { ManualProvider, createMediaResolver } from '../../app/context';
import { BUILTIN_STRINGS } from '../../app/strings';

const resolve = (target: string) => `#/ru/c/${target}`;

function withMedia(children: ReactNode, media: Record<string, string> = {}) {
  return render(
    <ManualProvider value={{
      strings: BUILTIN_STRINGS.ru,
      resolveMedia: createMediaResolver(media),
    }}>
      {children}
    </ManualProvider>,
  );
}

const BUNDLED = { '../content/media/qr.svg': '/assets/qr-a1b2.svg' };

describe('image', () => {
  it('renders the bundled URL for a named file', () => {
    const { container } = withMedia(
      <imageBlock.component
        block={{ type: 'image', src: 'media/qr.svg', alt: 'QR' }}
        resolveAnchor={resolve}
      />,
      BUNDLED,
    );
    const img = container.querySelector('img');
    expect(img?.getAttribute('src')).toBe('/assets/qr-a1b2.svg');
    expect(img?.getAttribute('alt')).toBe('QR');
    expect(img?.getAttribute('loading')).toBe('lazy');
  });

  it('renders a caption when there is one, and no figcaption when there is not', () => {
    const { container: captioned } = withMedia(
      <imageBlock.component
        block={{ type: 'image', src: 'media/qr.svg', alt: 'QR', caption: 'Экран QR' }}
        resolveAnchor={resolve}
      />,
      BUNDLED,
    );
    expect(captioned.querySelector('figcaption')?.textContent).toBe('Экран QR');

    const { container: bare } = withMedia(
      <imageBlock.component
        block={{ type: 'image', src: 'media/qr.svg', alt: 'QR' }}
        resolveAnchor={resolve}
      />,
      BUNDLED,
    );
    expect(bare.querySelector('figcaption')).toBeNull();
  });

  it('labels a gap, in the reader locale, when the file is not bundled', () => {
    const { container } = withMedia(
      <imageBlock.component
        block={{ type: 'image', src: 'media/ghost.svg', alt: 'нет' }}
        resolveAnchor={resolve}
      />,
    );
    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('.figure-missing')?.textContent)
      .toBe('Нет файла: media/ghost.svg');
  });

  it('indexes its caption, and nothing when it has none', () => {
    expect(imageBlock.searchText({ type: 'image', src: 'a', alt: 'b', caption: 'Экран' }))
      .toBe('Экран');
    expect(imageBlock.searchText({ type: 'image', src: 'a', alt: 'b' })).toBeNull();
  });
});

describe('video', () => {
  it('renders the bundled URL and resolves the poster too', () => {
    const { container } = withMedia(
      <videoBlock.component
        block={{ type: 'video', src: 'media/clip.mp4', poster: 'media/qr.svg' }}
        resolveAnchor={resolve}
      />,
      { ...BUNDLED, '../content/media/clip.mp4': '/assets/clip-c3.mp4' },
    );
    const video = container.querySelector('video');
    expect(video?.getAttribute('src')).toBe('/assets/clip-c3.mp4');
    expect(video?.getAttribute('poster')).toBe('/assets/qr-a1b2.svg');
  });

  it('labels a gap when the clip is not bundled', () => {
    const { container } = withMedia(
      <videoBlock.component
        block={{ type: 'video', src: 'media/ghost.mp4' }}
        resolveAnchor={resolve}
      />,
    );
    expect(container.querySelector('.figure-missing')).not.toBeNull();
  });

  it('indexes its caption, and nothing when it has none', () => {
    expect(videoBlock.searchText({ type: 'video', src: 'a', caption: 'Видео' })).toBe('Видео');
    expect(videoBlock.searchText({ type: 'video', src: 'a' })).toBeNull();
  });
});
