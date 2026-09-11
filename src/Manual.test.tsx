import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { Manual } from './Manual';
import { renderManual } from './renderManual';
import { resolveConfig } from './config';
import type { Chapter, Manifest } from './content/types';
import type { BuiltinBlock } from './content/types';

// jsdom implements no `scrollTo`, and `ChapterView` calls it on every route
// change. The same stub is in ChapterView.test.tsx.
vi.stubGlobal('scrollTo', () => {});

type L = 'ru' | 'kk';

const manifest: Manifest<L> = {
  version: 1, locales: ['ru', 'kk'],
  chapters: [{ id: 'start', file: '01-start.json' }],
};

const chapters = {
  '../content/ru/01-start.json': {
    default: {
      id: 'start', title: 'Начало',
      blocks: [{ type: 'paragraph', text: 'тело' }],
    } as Chapter<BuiltinBlock>,
  },
};

const config = (overrides: Record<string, unknown> = {}) =>
  resolveConfig({
    root: document.createElement('div'), brand: 'EG Delivery',
    manifest, chapters, routing: 'memory', ...overrides,
  } as never);

beforeEach(() => {
  window.location.hash = '';
  document.documentElement.removeAttribute('data-color-scheme');
  document.documentElement.lang = '';
});

describe('Manual', () => {
  it('renders the sidebar, the chapter and the layout container', () => {
    render(<Manual config={config()} />);
    expect(screen.getByText('EG Delivery')).toBeDefined();
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Начало');
    expect(document.querySelector('.manual')).not.toBeNull();
  });

  it('provides strings to its subtree, so no child throws', () => {
    expect(() => render(<Manual config={config()} />)).not.toThrow();
  });

  it('sets the colour scheme on the document element', () => {
    render(<Manual config={config({ colorScheme: 'system' })} />);
    expect(document.documentElement.dataset.colorScheme).toBe('system');
  });

  it('defaults the colour scheme to light', () => {
    render(<Manual config={config()} />);
    expect(document.documentElement.dataset.colorScheme).toBe('light');
  });

  it('syncs the document title and the html lang to the route', () => {
    render(<Manual config={config()} />);
    expect(document.title).toBe('Начало — EG Delivery');
    expect(document.documentElement.lang).toBe('ru');
  });

  it('honours a custom document title', () => {
    render(
      <Manual
        config={config({
          document: { title: ({ chapterId }: { chapterId: string }) => `docs/${chapterId}` },
        })}
      />,
    );
    expect(document.title).toBe('docs/start');
  });
});

describe('renderManual', () => {
  it('mounts into the given root and unmounts cleanly', () => {
    const root = document.createElement('div');
    document.body.append(root);

    // `createRoot().render()` schedules concurrently, so the mount is not
    // observable on the next line without flushing. `act` is the test's job:
    // forcing a synchronous flush inside `renderManual` would make every
    // consumer pay for this test's convenience.
    let handle!: ReturnType<typeof renderManual>;
    act(() => {
      handle = renderManual({
        root, brand: 'EG Delivery', manifest, chapters, routing: 'memory',
      });
    });
    expect(root.textContent).toContain('Начало');

    act(() => handle.unmount());
    expect(root.textContent).toBe('');
    root.remove();
  });

  it('puts the document back as it found it, so a host app can embed it', () => {
    document.title = 'Host app';
    document.documentElement.lang = 'en';

    const root = document.createElement('div');
    document.body.append(root);

    let handle!: ReturnType<typeof renderManual>;
    act(() => {
      handle = renderManual({
        root, brand: 'EG Delivery', manifest, chapters, routing: 'memory',
      });
    });
    expect(document.title).toBe('Начало — EG Delivery');

    act(() => handle.unmount());
    expect(document.title).toBe('Host app');
    expect(document.documentElement.lang).toBe('en');
    expect(document.documentElement.dataset.colorScheme).toBeUndefined();
    root.remove();
  });

  it('throws the config error rather than mounting a broken shell', () => {
    expect(() =>
      renderManual({
        root: document.createElement('div'), brand: 'T',
        manifest: { ...manifest, chapters: [] }, chapters,
      }),
    ).toThrow(/no chapters/i);
  });
});
