import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { inline } from './inline';

const resolve = (target: string) => `#/ru/${target.includes('/') ? target : `chapter/${target}`}`;

describe('inline', () => {
  it('renders plain text as plain text', () => {
    render(<p>{inline('просто текст', resolve)}</p>);
    expect(screen.getByText('просто текст')).toBeDefined();
  });

  it('renders **bold** as strong', () => {
    const { container } = render(<p>{inline('нажмите **Оплатить** сейчас', resolve)}</p>);
    expect(container.querySelector('strong')?.textContent).toBe('Оплатить');
    expect(container.textContent).toBe('нажмите Оплатить сейчас');
  });

  it('routes a same-chapter anchor through the resolver', () => {
    const { container } = render(<p>{inline('см. [оплату](#payment)', resolve)}</p>);
    const link = container.querySelector('a');
    expect(link?.getAttribute('href')).toBe('#/ru/chapter/payment');
    expect(link?.textContent).toBe('оплату');
  });

  it('routes a cross-chapter anchor through the resolver', () => {
    const { container } = render(<p>{inline('[возвраты](#refunds/partial)', resolve)}</p>);
    expect(container.querySelector('a')?.getAttribute('href')).toBe('#/ru/refunds/partial');
  });

  it('leaves raw HTML inert, because content is data', () => {
    const { container } = render(<p>{inline('<b>не тег</b>', resolve)}</p>);
    expect(container.querySelector('b')).toBeNull();
    expect(container.textContent).toBe('<b>не тег</b>');
  });

  it('handles several marks in one string', () => {
    const { container } = render(
      <p>{inline('**А** и [Б](#b) и **В**', resolve)}</p>,
    );
    expect(container.querySelectorAll('strong')).toHaveLength(2);
    expect(container.querySelectorAll('a')).toHaveLength(1);
  });
});
