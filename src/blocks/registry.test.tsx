import { describe, expect, it } from 'vitest';
import { createRegistry, defineBlock } from './registry';
import type { BlockBase } from '../content/types';

interface NoteBlock extends BlockBase {
  type: 'note';
  text: string;
}

const note = defineBlock<NoteBlock>({
  type: 'note',
  component: ({ block }) => <p className="note">{block.text}</p>,
  searchText: (block) => block.text,
  schema: { required: ['type', 'text'], properties: { type: { const: 'note' } } },
});

interface MarkBlock extends BlockBase {
  type: 'mark';
}

const mark = defineBlock<MarkBlock>({
  type: 'mark',
  component: () => <hr />,
  searchText: () => null,
  schema: { required: ['type'], properties: { type: { const: 'mark' } } },
});

describe('createRegistry', () => {
  it('looks a spec up by its type', () => {
    const registry = createRegistry([note, mark]);
    expect(registry.get('note')).toBe(note);
    expect(registry.has('mark')).toBe(true);
  });

  it('reports an unknown type as absent rather than throwing', () => {
    const registry = createRegistry([note]);
    expect(registry.get('nope')).toBeUndefined();
    expect(registry.has('nope')).toBe(false);
  });

  it('lists its types in registration order', () => {
    expect(createRegistry([note, mark]).types()).toEqual(['note', 'mark']);
  });

  it('rejects two specs claiming the same type', () => {
    expect(() => createRegistry([note, note])).toThrow(/note/);
  });

  it('rejects an empty registry, which would render every chapter blank', () => {
    expect(() => createRegistry([])).toThrow(/empty/i);
  });

  it('lets a later spec be swapped in explicitly, not silently', () => {
    const loud = defineBlock<NoteBlock>({ ...note, component: ({ block }) => <b>{block.text}</b> });
    expect(() => createRegistry([note, loud])).toThrow(/note/);
  });
});

describe('defineBlock', () => {
  it('returns its spec unchanged, existing only to infer T', () => {
    expect(note.type).toBe('note');
    expect(note.searchText({ type: 'note', text: 'hi' })).toBe('hi');
  });
});
