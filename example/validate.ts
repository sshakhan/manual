import { fileURLToPath } from 'node:url';
import { validateContent } from '@evrika/manual-kit/validate';
import { builtinBlocks, createRegistry } from '@evrika/manual-kit';
import { shortcutBlock } from './src/blocks/shortcut';

// The example's content uses `shortcut`, which the default registry rejects
// by design (that rejection is `manual-kit validate`'s own check working).
// This is what a consumer with custom blocks runs instead — the CLI's
// `validate` command only ever has the default registry to offer.
const registry = createRegistry([...builtinBlocks, shortcutBlock]);
const contentDir = fileURLToPath(new URL('./content', import.meta.url));

// Named rather than left to the lenient default: this is the one gap the
// example keeps on purpose (`kk/02-shortcuts.json`), so it is listed here
// instead of relying on "every gap is fine" — the shape the two real
// manuals also use in strict mode, minus the emptiness of their list.
const { errors, warnings } = validateContent({
  contentDir,
  registry,
  allowedGaps: [{ locale: 'kk', chapterId: 'shortcuts' }],
});

// A translation gap (the example keeps one on purpose) is a warning, not an
// error — see `validateContent`'s own doc comment for why — so it is printed
// but does not affect the exit code.
if (warnings.length > 0) {
  console.warn(`Предупреждения (${warnings.length}):\n`);
  for (const warning of warnings) console.warn(`  • ${warning}`);
  console.warn('');
}

if (errors.length > 0) {
  console.error(`Контент не прошёл проверку (${errors.length}):\n`);
  for (const error of errors) console.error(`  • ${error}`);
  process.exit(1);
}
console.log('Контент в порядке.');
