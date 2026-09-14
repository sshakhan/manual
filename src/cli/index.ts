#!/usr/bin/env node
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { argv, cwd, exit } from 'node:process';
import { buildSchema } from './schema';
import { validateContent } from './validate';
import { defaultRegistry } from '../blocks/builtin';
import { scaffold } from './scaffold';

const [command, ...rest] = argv.slice(2);

/**
 * The content dir defaults to `./content`, which is where both manuals keep
 * it. A custom registry cannot be passed on the command line — a consumer with
 * custom blocks imports `validateContent` from `@evrika/manual-kit/validate`
 * in a small script of their own, and the README shows that.
 */
const contentDir = rest.find((arg) => !arg.startsWith('-')) ?? join(cwd(), 'content');

/**
 * An *absent* `allowedGaps` is what keeps every translation gap a warning —
 * the default a consumer with no flag still gets. `--strict` passes an
 * empty `allowedGaps` rather than omitting the option, which is what turns
 * every gap into an error instead: see `validateContent`'s own doc comment.
 */
const strict = rest.includes('--strict');

switch (command) {
  case 'validate': {
    const { errors, warnings } = validateContent(strict ? { contentDir, allowedGaps: [] } : { contentDir });
    // Warnings get their own heading rather than being folded into the error
    // list — a translation gap read alongside a schema violation looks like
    // one undifferentiated wall of red, and only one of the two should ever
    // fail a build.
    if (warnings.length > 0) {
      console.warn(`Предупреждения (${warnings.length}):\n`);
      for (const warning of warnings) console.warn(`  • ${warning}`);
      console.warn('');
    }
    if (errors.length > 0) {
      console.error(`Контент не прошёл проверку (${errors.length}):\n`);
      for (const error of errors) console.error(`  • ${error}`);
      exit(1);
      break;
    }
    console.log('Контент в порядке.');
    break;
  }
  case 'schema': {
    const path = join(contentDir, 'schema.json');
    writeFileSync(path, `${JSON.stringify(buildSchema(defaultRegistry), null, 2)}\n`);
    console.log(`Схема записана: ${path}`);
    break;
  }
  case 'new-manual': {
    if (!rest[0]) {
      console.error('manual-kit new-manual <dir>');
      exit(1);
      break;
    }
    for (const path of scaffold(rest[0])) console.log(path);
    break;
  }
  default:
    console.error('manual-kit <validate | schema | new-manual>');
    exit(1);
}
