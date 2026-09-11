import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { headingBlock } from './heading';
import { paragraphBlock } from './paragraph';
import { listBlock } from './list';
import { stepsBlock } from './steps';

const resolve = (target: string) => `#/ru/c/${target}`;

describe('heading', () => {
  it('renders h2 or h3 by level, carrying the anchor id', () => {
    const { container } = render(
      <headingBlock.component
        block={{ type: 'heading', level: 2, id: 'payment', text: 'Оплата' }}
        resolveAnchor={resolve}
      />,
    );
    const h2 = container.querySelector('h2');
    expect(h2?.id).toBe('payment');
    expect(h2?.querySelector('a')?.getAttribute('href')).toBe('#/ru/c/payment');
  });

  it('renders level 3 as h3', () => {
    const { container } = render(
      <headingBlock.component
        block={{ type: 'heading', level: 3, id: 'qr', text: 'QR' }}
        resolveAnchor={resolve}
      />,
    );
    expect(container.querySelector('h3')).not.toBeNull();
  });

  it('indexes its text and outranks body copy by carrying the title', () => {
    expect(headingBlock.searchText({ type: 'heading', level: 2, id: 'a', text: 'Оплата' }))
      .toBe('Оплата');
  });
});

describe('paragraph', () => {
  it('renders inline markup', () => {
    const { container } = render(
      <paragraphBlock.component
        block={{ type: 'paragraph', text: 'нажмите **Оплатить**' }}
        resolveAnchor={resolve}
      />,
    );
    expect(container.querySelector('strong')?.textContent).toBe('Оплатить');
  });

  it('indexes its text', () => {
    expect(paragraphBlock.searchText({ type: 'paragraph', text: 'текст' })).toBe('текст');
  });
});

describe('list', () => {
  it('renders ul by default and ol when ordered', () => {
    const items = ['раз', 'два'];
    const { container: bulleted } = render(
      <listBlock.component block={{ type: 'list', items }} resolveAnchor={resolve} />,
    );
    expect(bulleted.querySelector('ul')).not.toBeNull();
    expect(bulleted.querySelectorAll('li')).toHaveLength(2);

    const { container: ordered } = render(
      <listBlock.component
        block={{ type: 'list', ordered: true, items }}
        resolveAnchor={resolve}
      />,
    );
    expect(ordered.querySelector('ol')).not.toBeNull();
  });

  it('indexes its items as one string', () => {
    expect(listBlock.searchText({ type: 'list', items: ['раз', 'два'] })).toBe('раз два');
  });
});

describe('steps', () => {
  it('numbers each step', () => {
    const { container } = render(
      <stepsBlock.component
        block={{ type: 'steps', items: ['первый', 'второй', 'третий'] }}
        resolveAnchor={resolve}
      />,
    );
    expect([...container.querySelectorAll('.steps-number')].map((n) => n.textContent))
      .toEqual(['1', '2', '3']);
  });

  it('indexes its items as one string', () => {
    expect(stepsBlock.searchText({ type: 'steps', items: ['раз', 'два'] })).toBe('раз два');
  });
});

describe('schemas', () => {
  it('each names its own type and nothing else', () => {
    for (const spec of [headingBlock, paragraphBlock, listBlock, stepsBlock]) {
      // One matcher rather than three reads plus a cast: `schema` is
      // `Record<string, unknown>` by design, since the library deliberately does
      // not model JSON Schema, and `toMatchObject` asserts into it without pretending to
      // know its shape.
      expect(spec.schema, spec.type).toMatchObject({
        additionalProperties: false,
        required: expect.arrayContaining(['type']),
        properties: { type: { const: spec.type } },
      });
    }
  });
});
