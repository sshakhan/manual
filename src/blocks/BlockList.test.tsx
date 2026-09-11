import { afterEach, describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import type { ReactNode } from 'react';
import { BlockList } from './BlockList';
import { builtinBlocks, defaultRegistry } from './builtin';
import { createRegistry, defineBlock } from './registry';
import { ManualProvider, createMediaResolver } from '../app/context';
import { BUILTIN_STRINGS } from '../app/strings';
import type { BlockBase, BuiltinBlock } from '../content/types';

const resolve = (target: string) => `#/ru/c/${target}`;

function withShell(children: ReactNode) {
  return render(
    <ManualProvider value={{
      strings: BUILTIN_STRINGS.ru,
      resolveMedia: createMediaResolver({}),
    }}>
      {children}
    </ManualProvider>,
  );
}

afterEach(() => vi.restoreAllMocks());

describe('builtinBlocks', () => {
  it('ships all nine types', () => {
    expect(defaultRegistry.types().sort()).toEqual([
      'callout', 'heading', 'image', 'keys', 'list',
      'paragraph', 'steps', 'table', 'video',
    ]);
  });

  it('gives every spec all three concerns', () => {
    for (const spec of builtinBlocks) {
      expect(typeof spec.component, spec.type).toBe('function');
      expect(typeof spec.searchText, spec.type).toBe('function');
      expect(spec.schema, spec.type).toBeTypeOf('object');
    }
  });
});

describe('BlockList', () => {
  it('renders each block through its registered component, in order', () => {
    const blocks: BuiltinBlock[] = [
      { type: 'heading', level: 2, id: 'a', text: 'Раз' },
      { type: 'paragraph', text: 'Два' },
      { type: 'list', items: ['Три'] },
    ];
    const { container } = withShell(
      <BlockList blocks={blocks} registry={defaultRegistry} resolveAnchor={resolve} />,
    );
    expect(container.querySelector('h2')?.textContent).toBe('Раз');
    expect(container.querySelector('.paragraph')?.textContent).toBe('Два');
    expect(container.querySelector('.list')?.textContent).toBe('Три');
  });

  it('renders a registered custom block', () => {
    interface NoteBlock extends BlockBase { type: 'note'; text: string }
    const noteBlock = defineBlock<NoteBlock>({
      type: 'note',
      component: ({ block }) => <aside className="note">{block.text}</aside>,
      searchText: (block) => block.text,
      schema: { required: ['type', 'text'], properties: { type: { const: 'note' } } },
    });
    const registry = createRegistry<BuiltinBlock | NoteBlock>([
      ...builtinBlocks, noteBlock,
    ]);
    const { container } = withShell(
      <BlockList
        blocks={[{ type: 'note', text: 'своё' }]}
        registry={registry}
        resolveAnchor={resolve}
      />,
    );
    expect(container.querySelector('.note')?.textContent).toBe('своё');
  });

  it('skips an unregistered type and warns, rather than crashing the chapter', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { container } = withShell(
      <BlockList
        blocks={[{ type: 'paragraph', text: 'виден' }, { type: 'nope' } as never]}
        registry={defaultRegistry}
        resolveAnchor={resolve}
      />,
    );
    expect(container.textContent).toContain('виден');
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('nope'));
  });

  it('keys by anchor id when present and by index otherwise', () => {
    // Annotated rather than inline: an inline array literal widens to a
    // structural type, and `B` would then be inferred from `blocks` instead of
    // agreeing with `defaultRegistry`.
    const mixed: BuiltinBlock[] = [
      { type: 'paragraph', text: 'а' },
      { type: 'paragraph', id: 'b', text: 'б' },
    ];
    const { container } = withShell(
      <BlockList
        blocks={mixed}
        registry={defaultRegistry}
        resolveAnchor={resolve}
      />,
    );
    expect(container.querySelectorAll('.paragraph')).toHaveLength(2);
  });
});
