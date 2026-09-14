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
 * custom blocks imports `validateContent` from a small script of their own, and
 * the README shows that.
 */
const contentDir = rest.find((arg) => !arg.startsWith('-')) ?? join(cwd(), 'content');

switch (command) {
  case 'validate': {
    const errors = validateContent({ contentDir });
    if (errors.length > 0) {
      console.error(`Контент не прошёл проверку (${errors.length}):\n`);
      for (const error of errors) console.error(`  • ${error}`);
      exit(1);
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
    scaffold(rest[0]);
    break;
  }
  default:
    console.error('manual-kit <validate | schema | new-manual>');
    exit(1);
}
