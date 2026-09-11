import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { calloutBlock } from './callout';
import { keysBlock } from './keys';
import { tableBlock } from './table';

const resolve = (target: string) => `#/ru/c/${target}`;

describe('callout', () => {
  it('carries its variant into the class name', () => {
    for (const variant of ['info', 'warning', 'danger', 'success'] as const) {
      const { container } = render(
        <calloutBlock.component
          block={{ type: 'callout', variant, text: 'внимание' }}
          resolveAnchor={resolve}
        />,
      );
      expect(container.querySelector(`.notice-${variant}`), variant).not.toBeNull();
    }
  });

  it('renders inline markup in its text', () => {
    const { container } = render(
      <calloutBlock.component
        block={{ type: 'callout', variant: 'warning', text: 'см. [оплату](#pay)' }}
        resolveAnchor={resolve}
      />,
    );
    expect(container.querySelector('a')?.getAttribute('href')).toBe('#/ru/c/pay');
  });

  it('indexes its text', () => {
    expect(calloutBlock.searchText({ type: 'callout', variant: 'info', text: 'т' })).toBe('т');
  });
});

describe('keys', () => {
  it('renders each key as a kbd joined by a separator', () => {
    const { container } = render(
      <keysBlock.component
        block={{ type: 'keys', combo: ['Ctrl', 'Shift', 'P'], text: 'открыть' }}
        resolveAnchor={resolve}
      />,
    );
    expect([...container.querySelectorAll('kbd')].map((k) => k.textContent))
      .toEqual(['Ctrl', 'Shift', 'P']);
    expect(container.querySelectorAll('.keys-plus')).toHaveLength(2);
  });

  it('renders a single key without a separator', () => {
    const { container } = render(
      <keysBlock.component
        block={{ type: 'keys', combo: ['F9'], text: 'оплата' }}
        resolveAnchor={resolve}
      />,
    );
    expect(container.querySelectorAll('.keys-plus')).toHaveLength(0);
  });

  it('indexes the combo and its description together', () => {
    expect(keysBlock.searchText({ type: 'keys', combo: ['Ctrl', 'P'], text: 'печать' }))
      .toBe('Ctrl + P печать');
  });
});

describe('table', () => {
  it('renders headers and rows', () => {
    const { container } = render(
      <tableBlock.component
        block={{ type: 'table', headers: ['Код', 'Что значит'], rows: [['1', 'ок'], ['2', 'нет']] }}
        resolveAnchor={resolve}
      />,
    );
    expect(container.querySelectorAll('th')).toHaveLength(2);
    expect(container.querySelectorAll('tbody tr')).toHaveLength(2);
    expect(container.querySelectorAll('td')).toHaveLength(4);
  });

  it('indexes headers and every cell', () => {
    expect(tableBlock.searchText({
      type: 'table', headers: ['Код'], rows: [['1'], ['2']],
    })).toBe('Код 1 2');
  });
});
