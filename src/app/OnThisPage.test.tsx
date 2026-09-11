import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { OnThisPage } from './OnThisPage';
import { ManualProvider } from './context';
import { BUILTIN_STRINGS } from './strings';
import type { BuiltinBlock } from '../content/types';

const route = { locale: 'ru' as const, chapterId: 'payment' };

function setup(blocks: BuiltinBlock[], activeId?: string) {
  return render(
    <ManualProvider value={{ strings: BUILTIN_STRINGS.ru, resolveMedia: () => undefined }}>
      <OnThisPage blocks={blocks} route={route} activeId={activeId} />
    </ManualProvider>,
  );
}

const blocks: BuiltinBlock[] = [
  { type: 'heading', level: 2, id: 'qr', text: 'Kaspi QR' },
  { type: 'paragraph', text: 'тело' },
  { type: 'heading', level: 3, id: 'cash', text: 'Наличные' },
];

describe('OnThisPage', () => {
  it('lists only headings, in order, linked by anchor', () => {
    setup(blocks);
    const links = [...document.querySelectorAll('.rail-link')];
    expect(links.map((a) => a.textContent)).toEqual(['Kaspi QR', 'Наличные']);
    expect(links[0]?.getAttribute('href')).toBe('#/ru/payment/qr');
  });

  it('carries the heading level, so the rail can indent', () => {
    setup(blocks);
    expect([...document.querySelectorAll('.rail-link')].map((a) => a.getAttribute('data-level')))
      .toEqual(['2', '3']);
  });

  it('marks the active section for assistive tech as well as by class', () => {
    setup(blocks, 'cash');
    const active = document.querySelector('.rail-link-active');
    expect(active?.textContent).toBe('Наличные');
    expect(active?.getAttribute('aria-current')).toBe('true');
  });

  it('renders nothing for a chapter with no headings, not an empty heading', () => {
    const { container } = setup([{ type: 'paragraph', text: 'тело' }]);
    expect(container.innerHTML).toBe('');
  });

  it('is labelled with the localised section title', () => {
    setup(blocks);
    expect(screen.getByRole('navigation', { name: 'В этом разделе' })).toBeDefined();
  });
});
