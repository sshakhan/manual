/**
 * Validates a content tree against the registry-derived schema, plus checks
 * that no schema can express: locale parity, cross-references, and media.
 *
 * Ported wholesale from `evrika-cashier-desktop/manual/scripts/
 * validate-content.ts`. Its comments explain each check's motivation and are
 * kept below: why an orphaned media file is worse than a missing one; why an
 * unresolved link is worse than a dead link; why locale parity is structural
 * rather than "the file exists".
 *
 * Three changes from the reference: this returns the error list instead of
 * calling `process.exit` (the exit code moves to `index.ts`, which is what
 * makes this testable); the schema comes from `buildSchema`, not a hand-
 * maintained `content/schema.json`; and two checks the open vocabulary needs
 * that a closed union never had to make — see `unknownBlockType` and
 * `badFilename` below.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import Ajv from 'ajv';
import { buildSchema } from './schema';
import { defaultRegistry } from '../blocks/builtin';
import type { BlockRegistry, JsonSchema } from '../blocks/registry';
import * as messages from './messages';

interface RawBlock {
  type: string;
  id?: string;
  text?: string;
  items?: string[];
  rows?: string[][];
  src?: string;
  poster?: string;
}

interface RawChapter {
  id: string;
  title: string;
  blocks: RawBlock[];
}

interface RawManifestChapter {
  id: string;
  file: string;
}

interface RawManifest {
  version: number;
  locales: string[];
  chapters: RawManifestChapter[];
}

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf8'));
}

/** Every text an author could have written a `[label](#target)` link into. */
function textsOf(block: RawBlock): string[] {
  const texts: string[] = [];
  if (typeof block.text === 'string') texts.push(block.text);
  if (Array.isArray(block.items)) texts.push(...block.items);
  if (Array.isArray(block.rows)) {
    for (const row of block.rows) texts.push(...row);
  }
  return texts;
}

const LINK = /\[[^\]]+\]\(#([a-z0-9-]+(?:\/[a-z0-9-]+)?)\)/g;

// `BlockRegistry<any>` for the reason documented in `schema.ts`'s `buildSchema`:
// `BlockSpec<T>` is invariant in `T`, so a caller's concrete registry (e.g.
// `BlockRegistry<BuiltinBlock>`) is not assignable to `BlockRegistry<AnyBlock>`.
export function validateContent(options: { contentDir: string; registry?: BlockRegistry<any> }): string[] {
  const { contentDir } = options;
  const registry = options.registry ?? defaultRegistry;

  const errors: string[] = [];
  const fail = (message: string): void => {
    errors.push(message);
  };

  const manifest = readJson<RawManifest>(join(contentDir, 'manifest.json'));
  const schema = buildSchema(registry);

  const ajv = new Ajv({ allErrors: true, strict: false });

  /*
   * Two validators instead of one whole-document `oneOf` check: a block that
   * fails validation fails all nine `oneOf` branches, and Ajv (with
   * `allErrors`) reports every one — a wall of `must NOT have additional
   * properties` and `must be equal to constant` from branches that were never
   * meant to match, with the one relevant line buried in it. By the time we
   * get here, the unknown-block-type check below has already confirmed every
   * block's `type` is in the registry, so each block can be checked against
   * its own branch instead.
   *
   * `validateShell` covers what only the whole document can: `id`, `title`,
   * and the chapter's own `additionalProperties`. Its `blocks` are loosened to
   * "an object with a `type`" — their content is `blockValidators`' job.
   */
  const shellSchema: JsonSchema = {
    ...schema,
    properties: {
      ...(schema.properties as Record<string, unknown>),
      blocks: { type: 'array', items: { type: 'object', required: ['type'] } },
    },
  };
  const validateShell = ajv.compile(shellSchema);

  const definitions = schema.definitions;
  const blockValidators = new Map(
    registry.specs().map((spec) => [
      spec.type,
      ajv.compile({ $schema: 'http://json-schema.org/draft-07/schema#', definitions, ...spec.schema }),
    ]),
  );

  /*
   * A manifest `file` naming a subdirectory loses its locale segment once
   * `createContentSource` keys modules by the trailing `<locale>/<file>` — the
   * chapter then reads as untranslated in *every* locale rather than failing
   * loudly. Caught once here, against the manifest itself, rather than once
   * per locale below.
   */
  const badEntries = new Set<string>();
  for (const entry of manifest.chapters) {
    if (entry.file.includes('/')) {
      fail(messages.badFilename(entry.file));
      badEntries.add(entry.id);
    }
  }

  const [baseLocale, ...otherLocales] = manifest.locales;
  const chaptersByLocale = new Map<string, Map<string, RawChapter>>();

  for (const locale of manifest.locales) {
    const chapters = new Map<string, RawChapter>();

    for (const entry of manifest.chapters) {
      if (badEntries.has(entry.id)) continue;

      const path = join(contentDir, locale, entry.file);

      if (!existsSync(path)) {
        fail(messages.missingFile(locale, entry.file));
        continue;
      }

      const chapter = readJson<RawChapter>(path);

      /*
       * Checked before the schema, so its message is the clearer one: a
       * closed union used to make an unrendered block type a compile error
       * (the `never` case in the renderer switch); an open registry cannot,
       * so this is the check that replaces it.
       */
      const unknownTypes = chapter.blocks.filter((block) => !registry.has(block.type));
      if (unknownTypes.length > 0) {
        for (const block of unknownTypes) {
          fail(messages.unknownBlockType(locale, entry.file, block.type));
        }
        continue;
      }

      if (!validateShell(chapter)) {
        for (const error of validateShell.errors ?? []) {
          fail(messages.schemaError(locale, entry.file, error.instancePath, error.message ?? 'не по схеме'));
        }
        continue;
      }

      let hasBlockSchemaError = false;
      chapter.blocks.forEach((block, index) => {
        // Never undefined here: `unknownTypes` above already `continue`d past
        // any block whose type is not in `blockValidators`.
        const blockValidate = blockValidators.get(block.type);
        if (!blockValidate) return;

        if (!blockValidate(block)) {
          hasBlockSchemaError = true;
          for (const error of blockValidate.errors ?? []) {
            fail(messages.schemaError(locale, entry.file, `/blocks/${index}${error.instancePath}`, error.message ?? 'не по схеме'));
          }
        }
      });
      if (hasBlockSchemaError) continue;

      if (chapter.id !== entry.id) {
        fail(messages.idMismatch(locale, entry.file, chapter.id, entry.id));
      }

      const anchors = chapter.blocks
        .map((block) => block.id)
        .filter((id): id is string => Boolean(id));
      const duplicates = anchors.filter((id, index) => anchors.indexOf(id) !== index);
      for (const duplicate of new Set(duplicates)) {
        fail(messages.duplicateAnchor(locale, entry.file, duplicate));
      }

      chapters.set(entry.id, chapter);
    }

    chaptersByLocale.set(locale, chapters);
  }

  // Media, both directions.
  //
  // A **missing** file renders as a labelled gap rather than a broken image,
  // so nothing shouts; an **orphaned** one is worse — it is a drawing no
  // chapter shows any more, and the one that started this check was a mockup
  // of a screen the app does not have. Neither is visible without looking, so
  // both fail here.
  const mediaDir = join(contentDir, 'media');
  const mediaOnDisk = new Set(existsSync(mediaDir) ? readdirSync(mediaDir) : []);
  const mediaUsed = new Set<string>();

  for (const chapters of chaptersByLocale.values()) {
    for (const [chapterId, chapter] of chapters) {
      for (const block of chapter.blocks) {
        for (const ref of [block.src, block.poster]) {
          if (!ref) continue;

          const file = ref.replace(/^media\//, '');
          mediaUsed.add(file);

          if (!mediaOnDisk.has(file)) {
            fail(messages.mediaMissing(chapterId, ref));
          }
        }
      }
    }
  }

  for (const file of mediaOnDisk) {
    if (!mediaUsed.has(file)) {
      fail(messages.mediaOrphan(file));
    }
  }

  // Cross-references. A link target that does not resolve is worse than a
  // dead link: `#section` is looked up in whatever chapter the reader is
  // standing in, so a target meant for another chapter silently sends them
  // nowhere.
  for (const locale of manifest.locales) {
    const chapters = chaptersByLocale.get(locale);
    if (!chapters) continue;

    const anchorsOf = (id: string): Set<string> => {
      const chapter = chapters.get(id);
      const ids = chapter
        ? chapter.blocks.map((block) => block.id).filter((blockId): blockId is string => Boolean(blockId))
        : [];
      return new Set(ids);
    };

    for (const [chapterId, chapter] of chapters) {
      for (const text of chapter.blocks.flatMap((block) => textsOf(block))) {
        for (const match of text.matchAll(LINK)) {
          const target = match[1];
          if (target === undefined) continue;

          const [first, second] = target.split('/');
          if (first === undefined) continue;

          const targetChapter = second === undefined ? chapterId : first;
          const targetSection = second ?? first;

          if (!chapters.has(targetChapter)) {
            fail(messages.linkMissingChapter(locale, chapterId, targetChapter));
            continue;
          }

          if (!anchorsOf(targetChapter).has(targetSection)) {
            fail(messages.linkMissingAnchor(locale, chapterId, target, targetChapter, targetSection));
          }
        }
      }
    }
  }

  // Locale parity: not just "the file exists", but the same block sequence
  // and the same anchor ids in every locale. That is what stops a half-
  // translated release, where a locale silently loses a step from a flow
  // because a translator dropped a block.
  if (baseLocale !== undefined) {
    for (const locale of otherLocales) {
      for (const entry of manifest.chapters) {
        const base = chaptersByLocale.get(baseLocale)?.get(entry.id);
        const other = chaptersByLocale.get(locale)?.get(entry.id);
        if (!base || !other) continue;

        if (base.blocks.length !== other.blocks.length) {
          fail(messages.blockCountMismatch(locale, entry.file, other.blocks.length, baseLocale, base.blocks.length));
          continue;
        }

        base.blocks.forEach((block, index) => {
          const mirror = other.blocks[index];
          if (!mirror) return;

          if (block.type !== mirror.type) {
            fail(messages.blockTypeMismatch(locale, entry.file, index, mirror.type, baseLocale, block.type));
          }

          if (block.id !== mirror.id) {
            fail(messages.blockAnchorMismatch(locale, entry.file, index, mirror.id, baseLocale, block.id));
          }
        });
      }
    }
  }

  return errors;
}
