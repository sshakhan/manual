import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Sidebar } from './Sidebar';
import { resolveConfig } from '../config';
import { ManualProvider } from './context';
import type { Chapter, Manifest } from '../content/types';
import type { BuiltinBlock } from '../content/types';

type L = 'ru' | 'kk';

const manifest: Manifest<L> = {
  version: 1, locales: ['ru', 'kk'],
  chapters: [
    { id: 'start', file: '01-start.json' },
    { id: 'payment', file: '02-payment.json' },
  ],
};

const chapters = {
  '../content/ru/01-start.json': { default: { id: 'start', title: 'Начало', blocks: [] } as Chapter<BuiltinBlock> },
  '../content/ru/02-payment.json': { default: { id: 'payment', title: 'Оплата', blocks: [] } as Chapter<BuiltinBlock> },
};

function setup(overrides: Record<string, unknown> = {}) {
  const config = resolveConfig({
    root: document.createElement('div'), brand: 'EG Delivery', manifest, chapters, ...overrides,
  } as never);
  // The `as never` above (needed so `overrides` can widen the config) also
  // widens `L` to `string`, so this lookup is an index access and
  // `noUncheckedIndexedAccess` types it as possibly undefined — narrow rather
  // than assert past it (same pattern as `search/SearchBox.test.tsx`).
  const strings = config.locales.strings.ru;
  if (!strings) throw new Error('test setup: config resolved without ru strings');
  const onNavigate = vi.fn();
  const onLocaleChange = vi.fn();
  render(
    <ManualProvider value={{ strings, resolveMedia: () => undefined }}>
      <Sidebar
        config={config}
        route={{ locale: 'ru', chapterId: 'payment' }}
        onNavigate={onNavigate}
        onLocaleChange={onLocaleChange}
      />
    </ManualProvider>,
  );
  return { onNavigate, onLocaleChange };
}

describe('Sidebar', () => {
  it('renders the configured brand, not a hardcoded one', () => {
    setup();
    expect(screen.getByText('EG Delivery')).toBeDefined();
    expect(screen.queryByText('Evrika Cashier')).toBeNull();
  });

  it('renders the renderBrand slot when given one', () => {
    setup({ slots: { renderBrand: () => <img alt="EG" src="/logo.svg" /> } });
    expect(screen.getByAltText('EG')).toBeDefined();
  });

  it('lists every chapter, numbered, in manifest order', () => {
    setup();
    expect([...document.querySelectorAll('.toc-number')].map((n) => n.textContent)).toEqual(['1', '2']);
    expect([...document.querySelectorAll('.toc-title')].map((n) => n.textContent))
      .toEqual(['Начало', 'Оплата']);
  });

  it('marks the current chapter', () => {
    setup();
    expect(document.querySelector('.toc-link-active')?.textContent).toContain('Оплата');
  });

  it('offers one button per locale, labelled with its own name', () => {
    setup();
    expect(screen.getByRole('button', { name: 'Русский' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Қазақ тілі' })).toBeDefined();
  });

  it('reports a locale choice', async () => {
    const { onLocaleChange } = setup();
    await userEvent.click(screen.getByRole('button', { name: 'Қазақ тілі' }));
    expect(onLocaleChange).toHaveBeenCalledWith('kk');
  });

  it('groups the locale switch under the localised label', () => {
    setup();
    expect(screen.getByRole('group', { name: 'Язык' })).toBeDefined();
  });

  it('collapses and expands the body for a narrow window', async () => {
    setup();
    const toggle = screen.getByRole('button', { name: 'Открыть разделы' });
    expect(document.getElementById('sidebar-body')?.dataset.open).toBe('false');
    await userEvent.click(toggle);
    expect(document.getElementById('sidebar-body')?.dataset.open).toBe('true');
    expect(screen.getByRole('button', { name: 'Закрыть разделы' })).toBeDefined();
  });

  it('renders the renderSidebarFooter slot', () => {
    setup({ slots: { renderSidebarFooter: () => <small>v1.2.3</small> } });
    expect(screen.getByText('v1.2.3')).toBeDefined();
  });

  it('omits the search box when search is disabled', () => {
    setup({ search: { enabled: false } });
    expect(screen.queryByRole('searchbox')).toBeNull();
  });
});
