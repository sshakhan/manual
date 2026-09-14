import { fileURLToPath } from 'node:url';
/*
 * `validateContent` is not part of the package's public surface: it is not
 * re-exported from `src/index.ts` (doing so would pull `node:fs`/`node:path`
 * into the same entry the browser bundle is built from), and there is no
 * `./cli` or `./validate` subpath in `package.json`'s `exports` either. A real
 * external consumer with custom blocks cannot reach it at all right now, even
 * though `cli/index.ts`'s own comment says one "imports `validateContent`
 * from a small script of their own". This whole file's relative imports are a
 * stand-in for that missing export — reported in the task-22 report as a
 * public API gap, not worked around silently.
 */
import { validateContent } from '../src/cli/validate';
import { builtinBlocks, createRegistry } from '../src/index';
import { shortcutBlock } from './src/blocks/shortcut';

// The example's content uses `shortcut`, which the default registry rejects
// by design (that rejection is `manual-kit validate`'s own check working).
// This is what a consumer with custom blocks runs instead — the CLI's
// `validate` command only ever has the default registry to offer.
const registry = createRegistry([...builtinBlocks, shortcutBlock]);
const contentDir = fileURLToPath(new URL('./content', import.meta.url));
const errors = validateContent({ contentDir, registry });

if (errors.length > 0) {
  console.error(`Контент не прошёл проверку (${errors.length}):\n`);
  for (const error of errors) console.error(`  • ${error}`);
  process.exit(1);
}
console.log('Контент в порядке.');
