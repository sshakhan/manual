import type { BlockRegistry } from '../blocks/registry';
import type { JsonSchema } from '../blocks/registry';

/**
 * The chapter schema, assembled from the registry.
 *
 * Generated rather than hand-maintained: the reference implementation kept
 * `content/schema.json` in the repo beside a renderer switch and a search
 * switch, and nothing checked the three agreed. Deriving it from the specs is
 * what makes disagreement impossible rather than merely unlikely.
 *
 * `BlockRegistry<any>` rather than the bare type (= `BlockRegistry<AnyBlock>`):
 * `BlockSpec<T>` is invariant in `T` (see `registry.ts`), so a concrete
 * `BlockRegistry<BuiltinBlock>` like `defaultRegistry` is not assignable to
 * `BlockRegistry<AnyBlock>`. This function only reads `.specs()` for their
 * `schema` fragments and never touches `.component`, so the erasure costs
 * nothing here — the same trade `createRegistry` already makes for
 * `BlockSpec<any>`.
 */
export function buildSchema(registry: BlockRegistry<any>, id = 'https://evrika.com/manual/schema.json'): JsonSchema {
  return {
    $schema: 'http://json-schema.org/draft-07/schema#',
    $id: id,
    title: 'Глава руководства',
    type: 'object',
    required: ['id', 'title', 'blocks'],
    additionalProperties: false,
    properties: {
      // Optional, and not in `required`: this is the `"$schema":
      // "./schema.json"` a chapter file carries for editor autocomplete, not
      // a value the content itself needs. Without it here,
      // `additionalProperties: false` would reject the very reference the
      // spec promises every chapter keeps.
      $schema: { type: 'string' },
      id: { type: 'string', pattern: '^[a-z0-9-]+$' },
      title: { type: 'string', minLength: 1 },
      blocks: { type: 'array', items: { $ref: '#/definitions/block' } },
    },
    definitions: {
      anchor: { type: 'string', pattern: '^[a-z0-9-]+$' },
      nonEmptyText: { type: 'string', minLength: 1 },
      stringList: { type: 'array', minItems: 1, items: { $ref: '#/definitions/nonEmptyText' } },
      block: {
        type: 'object',
        required: ['type'],
        oneOf: registry.specs().map((spec) => spec.schema),
      },
    },
  };
}
