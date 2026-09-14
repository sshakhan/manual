import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { validateContent } from './validate';
import { createRegistry, defineBlock } from '../blocks/registry';
import { builtinBlocks } from '../blocks/builtin';
import type { BlockBase } from '../content/types';

const fixture = (name: string) =>
  fileURLToPath(new URL(`./__fixtures__/${name}`, import.meta.url));

const errorsFor = (name: string) => validateContent({ contentDir: fixture(name) });

describe('validateContent on a clean tree', () => {
  it('reports nothing', () => {
    expect(errorsFor('clean')).toEqual([]);
  });
});

describe('validateContent on a broken tree', () => {
  const errors = errorsFor('broken').join('\n');

  it.each([
    ['a chapter file the manifest promises', /файла нет/],
    ['a chapter id that disagrees with the manifest', /не совпадает с manifest/],
    ['a duplicated anchor', /повторяется/],
    ['media a chapter names but does not have', /нет в content\/media/],
    ['media nobody shows', /его никто не показывает/],
    ['a link to a missing anchor', /нет якоря/],
    ['a link to a missing chapter', /несуществующую главу/],
    ['a locale with a different block count', /блоков/],
    ['a locale with a different block type', /в ru — /],
    ['a block type no spec renders', /неизвестный тип блока/],
    ['a chapter that breaks the schema', /required property/],
    ['a manifest file naming a subdirectory', /не должно содержать/],
    ['a locale with a different anchor id on an otherwise identical block', /блок #\d+ — якорь/],
  ])('catches %s', (_label, pattern) => {
    expect(errors).toMatch(pattern);
  });

  it('finds every one of them in a single pass, not just the first', () => {
    expect(errorsFor('broken').length).toBeGreaterThanOrEqual(13);
  });
});

describe('validateContent with a custom registry', () => {
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

  it('accepts content using a registered custom block', () => {
    expect(validateContent({
      contentDir: fixture('custom'),
      registry: createRegistry([...builtinBlocks, noteBlock]),
    })).toEqual([]);
  });

  it('rejects the same content under the default registry', () => {
    expect(errorsFor('custom').join('\n')).toMatch(/note/);
  });
});
