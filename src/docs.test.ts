import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { defaultRegistry } from './blocks/builtin';
import { UI_STRING_KEYS } from './app/strings';

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const tokens = read('docs/tokens.md');
const readme = read('README.md');
const styles = read('src/styles/tokens.css');

describe('docs/tokens.md', () => {
  it('documents every token the stylesheet declares', () => {
    const declared = [...styles.matchAll(/^\s*(--manual-[a-z0-9-]+):/gm)].map((match) => match[1]!);
    for (const token of new Set(declared)) {
      expect(tokens, token).toContain(token);
    }
  });

  it('documents no token the stylesheet does not declare', () => {
    const documented = [...tokens.matchAll(/`(--manual-[a-z0-9-]+)`/g)].map((match) => match[1]!);
    for (const token of new Set(documented)) {
      expect(styles, token).toContain(`${token}:`);
    }
  });
});

describe('README.md', () => {
  it('documents every block type', () => {
    for (const type of defaultRegistry.types()) {
      expect(readme, type).toContain(`\`${type}\``);
    }
  });

  it('documents every UI string key', () => {
    for (const key of UI_STRING_KEYS) {
      expect(readme, key).toContain(key);
    }
  });

  it('shows the consumer surface with both globs', () => {
    expect(readme).toContain("import.meta.glob('../content/*/*.json'");
    expect(readme).toContain("import.meta.glob('../content/media/*'");
  });

  it('documents all three CLI commands', () => {
    for (const command of ['manual-kit validate', 'manual-kit schema', 'manual-kit new-manual']) {
      expect(readme, command).toContain(command);
    }
  });
});
