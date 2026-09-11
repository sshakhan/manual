import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SearchBox } from './SearchBox';
import { resolveConfig } from '../config';
import { ManualProvider } from '../app/context';
import type { Chapter, Manifest } from '../content/types';
import type { BuiltinBlock } from '../content/types';

type L = 'ru' | 'kk';

const manifest: Manifest<L> = {
  version: 1, locales: ['ru', 'kk'],
  chapters: [{ id: 'payment', file: '01-payment.json' }],
};

const chapter: Chapter<BuiltinBlock> = {
  id: 'payment', title: 'Оплата',
  blocks: [
    { type: 'heading', level: 2, id: 'qr', text: 'Kaspi QR' },
    { type: 'paragraph', text: 'Покажите QR клиенту.' },
  ],
};

function setup(overrides: Partial<Parameters<typeof resolveConfig>[0]> = {}) {
  const config = resolveConfig({
    root: document.createElement('div'), brand: 'T', manifest,
    chapters: { '../content/ru/01-payment.json': { default: chapter } },
    ...overrides,
  } as never);
  // The `as never` above (needed so `overrides` can widen the config) also
  // widens `L` to `string`, so this lookup is an index access and
  // `noUncheckedIndexedAccess` types it as possibly undefined — narrow rather
  // than assert past it.
  const strings = config.locales.strings.ru;
  if (!strings) throw new Error('test setup: config resolved without ru strings');
  const onNavigate = vi.fn();
  render(
    <ManualProvider value={{ strings, resolveMedia: () => undefined }}>
      <SearchBox config={config} route={{ locale: 'ru', chapterId: 'payment' }} onNavigate={onNavigate} />
    </ManualProvider>,
  );
  return { onNavigate };
}

describe('SearchBox', () => {
  it('is labelled by the locale placeholder', () => {
    setup();
    expect(screen.getByRole('searchbox', { name: 'Поиск по руководству' })).toBeDefined();
  });

  it('shows the hint below the minimum query length', async () => {
    setup();
    await userEvent.type(screen.getByRole('searchbox'), 'о');
    expect(screen.getByText('Введите хотя бы два символа')).toBeDefined();
  });

  it('shows results for a real query', async () => {
    setup();
    await userEvent.type(screen.getByRole('searchbox'), 'QR');
    // Both the heading and the paragraph below it match «QR», so there are two
    // hits and `getByText` would be ambiguous. Assert the shape of the first
    // instead: a hit names where it lands, chapter then section.
    const hits = screen.getAllByRole('button');
    expect(hits.length).toBeGreaterThan(0);
    expect(hits[0]?.textContent).toContain('Оплата');
    expect(hits[0]?.textContent).toContain('Kaspi QR');
  });

  it('reports an empty result set', async () => {
    setup();
    await userEvent.type(screen.getByRole('searchbox'), 'зззз');
    expect(screen.getByText('Ничего не найдено')).toBeDefined();
  });

  it('navigates to the hit section and clears the query', async () => {
    const { onNavigate } = setup();
    await userEvent.type(screen.getByRole('searchbox'), 'Покажите');
    await userEvent.click(screen.getAllByRole('button')[0]!);
    expect(onNavigate).toHaveBeenCalledWith({ locale: 'ru', chapterId: 'payment', sectionId: 'qr' });
    // `toHaveValue` is a jest-dom matcher and jest-dom is not a dependency
    // here; the typed getter reads the same and needs no cast.
    expect(screen.getByRole<HTMLInputElement>('searchbox').value).toBe('');
  });

  it('renders the renderSearchEmpty slot instead of the default message', async () => {
    setup({ slots: { renderSearchEmpty: ({ query }) => <p>ничего про «{query}»</p> } });
    await userEvent.type(screen.getByRole('searchbox'), 'зззз');
    expect(screen.getByText('ничего про «зззз»')).toBeDefined();
    expect(screen.queryByText('Ничего не найдено')).toBeNull();
  });

  it('renders nothing at all when search is disabled', () => {
    const config = resolveConfig({
      root: document.createElement('div'), brand: 'T', manifest,
      chapters: { '../content/ru/01-payment.json': { default: chapter } },
      search: { enabled: false },
    });
    const { container } = render(
      <ManualProvider value={{ strings: config.locales.strings.ru, resolveMedia: () => undefined }}>
        <SearchBox config={config} route={{ locale: 'ru', chapterId: 'payment' }} onNavigate={vi.fn()} />
      </ManualProvider>,
    );
    expect(container.innerHTML).toBe('');
  });
});
