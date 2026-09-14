import { describe, expect, it } from 'vitest';
import Ajv from 'ajv';
import { buildSchema } from './schema';
import { createRegistry, defineBlock } from '../blocks/registry';
import { builtinBlocks, defaultRegistry } from '../blocks/builtin';
import type { BlockBase } from '../content/types';

const compile = (schema: object) => new Ajv({ allErrors: true, strict: false }).compile(schema);

describe('buildSchema', () => {
  const schema = buildSchema(defaultRegistry);
  const validate = compile(schema);

  it('supplies the shared definitions the fragments $ref', () => {
    const definitions = schema.definitions as Record<string, unknown>;
    expect(definitions.anchor).toBeDefined();
    expect(definitions.nonEmptyText).toBeDefined();
    expect(definitions.stringList).toBeDefined();
    expect(definitions.block).toBeDefined();
  });

  it('has one oneOf branch per registered block type', () => {
    const block = (schema.definitions as { block: { oneOf: unknown[] } }).block;
    expect(block.oneOf).toHaveLength(defaultRegistry.types().length);
  });

  it('accepts a valid chapter', () => {
    expect(validate({
      id: 'payment', title: 'Оплата',
      blocks: [
        { type: 'heading', level: 2, id: 'qr', text: 'Kaspi QR' },
        { type: 'paragraph', text: 'тело' },
        { type: 'keys', combo: ['Ctrl', 'P'], text: 'печать' },
        { type: 'table', headers: ['A'], rows: [['1']] },
      ],
    })).toBe(true);
  });

  it('rejects a chapter missing its title', () => {
    expect(validate({ id: 'a', blocks: [] })).toBe(false);
  });

  it('rejects an unknown block type', () => {
    expect(validate({ id: 'a', title: 'A', blocks: [{ type: 'nope' }] })).toBe(false);
  });

  it('rejects a heading without an anchor id', () => {
    expect(validate({ id: 'a', title: 'A', blocks: [{ type: 'heading', level: 2, text: 'T' }] })).toBe(false);
  });

  it('rejects an anchor that is not a slug', () => {
    expect(validate({
      id: 'a', title: 'A',
      blocks: [{ type: 'heading', level: 2, id: 'Not A Slug', text: 'T' }],
    })).toBe(false);
  });

  it('rejects a heading level the renderer cannot render', () => {
    expect(validate({
      id: 'a', title: 'A',
      blocks: [{ type: 'heading', level: 4, id: 'x', text: 'T' }],
    })).toBe(false);
  });

  it('rejects a property no block declares', () => {
    expect(validate({
      id: 'a', title: 'A',
      blocks: [{ type: 'paragraph', text: 'т', colour: 'red' }],
    })).toBe(false);
  });

  it('grows a branch for a custom block, so custom content validates', () => {
    interface NoteBlock extends BlockBase { type: 'note'; text: string }
    const noteBlock = defineBlock<NoteBlock>({
      type: 'note',
      component: () => null,
      searchText: (block) => block.text,
      schema: {
        required: ['type', 'text'],
        additionalProperties: false,
        properties: { type: { const: 'note' }, text: { $ref: '#/definitions/nonEmptyText' } },
      },
    });
    const custom = compile(buildSchema(createRegistry([...builtinBlocks, noteBlock])));
    expect(custom({ id: 'a', title: 'A', blocks: [{ type: 'note', text: 'своё' }] })).toBe(true);
    expect(custom({ id: 'a', title: 'A', blocks: [{ type: 'note' }] })).toBe(false);
  });
});
