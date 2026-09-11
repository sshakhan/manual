import { beforeAll, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ChapterView } from './ChapterView';
import { resolveConfig } from '../config';
import { ManualProvider } from './context';
import type { Chapter, Manifest } from '../content/types';
import type { BuiltinBlock } from '../content/types';

// jsdom has no layout: `scrollTo` logs a "not implemented" error on every
// render. The scrolling itself is not what these tests are about — where the
// content and the nav land is.
beforeAll(() => {
  vi.stubGlobal('scrollTo', vi.fn());
});

type L = 'ru' | 'kk';

const manifest: Manifest<L> = {
  version: 1, locales: ['ru', 'kk'],
  chapters: [
    { id: 'start', file: '01-start.json' },
    { id: 'payment', file: '02-payment.json' },
    { id: 'history', file: '03-history.json' },
  ],
};

const payment: Chapter<BuiltinBlock> = {
  id: 'payment', title: 'Оплата',
  blocks: [
    { type: 'heading', level: 2, id: 'qr', text: 'Kaspi QR' },
    { type: 'paragraph', text: 'Покажите QR.' },
  ],
};

// Kazakh has 'start' but not 'payment': the fallback path is what this covers.
const chapters = {
  '../content/ru/01-start.json': { default: { id: 'start', title: 'Начало', blocks: [] } as Chapter<BuiltinBlock> },
  '../content/ru/02-payment.json': { default: payment },
  '../content/ru/03-history.json': { default: { id: 'history', title: 'История', blocks: [] } as Chapter<BuiltinBlock> },
  '../content/kk/01-start.json': { default: { id: 'start', title: 'Бастау', blocks: [] } as Chapter<BuiltinBlock> },
};

function setup(route: { locale: L; chapterId: string; sectionId?: string }, overrides: Record<string, unknown> = {}) {
  const config = resolveConfig({
    root: document.createElement('div'), brand: 'T', manifest, chapters, ...overrides,
  } as never);
  // The `as never` above (needed so `overrides` can widen the config) also
  // widens `L` to `string`, so this lookup is an index access and
  // `noUncheckedIndexedAccess` types it as possibly undefined — narrow rather
  // than assert past it (same pattern as `search/SearchBox.test.tsx`).
  const strings = config.locales.strings[route.locale];
  if (!strings) throw new Error(`test setup: config resolved without ${route.locale} strings`);
  return render(
    <ManualProvider value={{ strings, resolveMedia: () => undefined }}>
      <ChapterView config={config} route={route} />
    </ManualProvider>,
  );
}

describe('ChapterView', () => {
  it('renders the chapter title and its blocks', () => {
    setup({ locale: 'ru', chapterId: 'payment' });
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Оплата');
    expect(screen.getByText('Покажите QR.')).toBeDefined();
  });

  it('renders the section rail for a chapter with headings', () => {
    setup({ locale: 'ru', chapterId: 'payment' });
    expect(screen.getByRole('navigation', { name: 'В этом разделе' })).toBeDefined();
  });

  it('shows the fallback notice when the locale lacks the chapter', () => {
    setup({ locale: 'kk', chapterId: 'payment' });
    expect(screen.getByText('Бұл бөлім әлі аударылмаған — орысша мәтін көрсетілген.')).toBeDefined();
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Оплата');
  });

  it('shows no notice when the chapter is genuinely translated', () => {
    setup({ locale: 'kk', chapterId: 'start' });
    expect(screen.queryByText(/аударылмаған/)).toBeNull();
  });

  it('reports a chapter that does not exist at all', () => {
    setup({ locale: 'ru', chapterId: 'ghost' });
    expect(screen.getByText('Раздел не найден.')).toBeDefined();
  });

  it('links both neighbours by title', () => {
    setup({ locale: 'ru', chapterId: 'payment' });
    const previous = document.querySelector('.chapter-nav-previous');
    const next = document.querySelector('.chapter-nav-next');
    expect(previous?.textContent).toContain('Начало');
    expect(previous?.getAttribute('href')).toBe('#/ru/start');
    expect(next?.textContent).toContain('История');
  });

  // Two tests, not one: a single test calling `setup` twice leaves both trees
  // mounted, and the last-chapter assertion then passes on the sum across them
  // rather than on the last chapter alone. Testing Library cleans up between
  // tests, so splitting is the honest fix.
  it('omits the previous link on the first chapter', () => {
    setup({ locale: 'ru', chapterId: 'start' });
    expect(document.querySelector('.chapter-nav-previous')).toBeNull();
    expect(document.querySelector('.chapter-nav-next')).not.toBeNull();
  });

  it('omits the next link on the last chapter', () => {
    setup({ locale: 'ru', chapterId: 'history' });
    expect(document.querySelector('.chapter-nav-next')).toBeNull();
    expect(document.querySelector('.chapter-nav-previous')).not.toBeNull();
  });

  it('renders the renderChapterFooter slot', () => {
    setup({ locale: 'ru', chapterId: 'payment' }, {
      slots: { renderChapterFooter: ({ chapterId }: { chapterId: string }) => <p>правки: {chapterId}</p> },
    });
    expect(screen.getByText('правки: payment')).toBeDefined();
  });

  it('renders a block type from a custom registry', () => {
    setup({ locale: 'ru', chapterId: 'payment' });
    expect(document.querySelector('.heading-2')).not.toBeNull();
  });
});
