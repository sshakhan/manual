import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ManualProvider, createMediaResolver, useManual } from './context';
import { BUILTIN_STRINGS } from './strings';

function Probe() {
  const { strings, resolveMedia } = useManual();
  return (
    <>
      <span data-testid="s">{strings.onThisPage}</span>
      <span data-testid="m">{resolveMedia('media/a.svg') ?? 'none'}</span>
    </>
  );
}

describe('useManual', () => {
  it('reads strings and the media resolver from the provider', () => {
    render(
      <ManualProvider value={{
        strings: BUILTIN_STRINGS.ru,
        resolveMedia: createMediaResolver({ '../content/media/a.svg': '/a-hash.svg' }),
      }}>
        <Probe />
      </ManualProvider>,
    );
    expect(screen.getByTestId('s').textContent).toBe('В этом разделе');
    expect(screen.getByTestId('m').textContent).toBe('/a-hash.svg');
  });

  it('throws outside a provider, rather than rendering a broken shell', () => {
    expect(() => render(<Probe />)).toThrow(/ManualProvider/);
  });
});

describe('createMediaResolver', () => {
  it('matches a glob key by its trailing content path', () => {
    const resolve = createMediaResolver({
      '../content/media/kaspi-qr.svg': '/assets/kaspi-qr-a1b2.svg',
      '../../content/media/other.png': '/assets/other-c3d4.png',
    });
    expect(resolve('media/kaspi-qr.svg')).toBe('/assets/kaspi-qr-a1b2.svg');
    expect(resolve('media/other.png')).toBe('/assets/other-c3d4.png');
  });

  it('returns undefined for a file nobody bundled', () => {
    expect(createMediaResolver({})('media/ghost.svg')).toBeUndefined();
    expect(createMediaResolver(undefined)('media/ghost.svg')).toBeUndefined();
  });

  it('does not match a path that merely ends with the same characters', () => {
    const resolve = createMediaResolver({ '../content/media/xqr.svg': '/x.svg' });
    expect(resolve('media/qr.svg')).toBeUndefined();
  });
});
