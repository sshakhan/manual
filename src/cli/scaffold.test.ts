import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { scaffold } from './scaffold';

let dir = '';
beforeEach(() => { dir = mkdtempSync(join(tmpdir(), 'manual-kit-')); });
afterEach(() => rmSync(dir, { recursive: true, force: true }));

describe('scaffold', () => {
  it('writes a manual that needs only content', () => {
    const written = scaffold(dir).map((path) => path.replace(`${dir}/`, ''));
    expect(written.sort()).toEqual([
      'content/kk/01-getting-started.json',
      'content/manifest.json',
      'content/ru/01-getting-started.json',
      'index.html',
      'package.json',
      'src/main.tsx',
      'src/theme.css',
      'vite.config.ts',
    ]);
  });

  it('keeps main.tsx under thirty lines — the whole point of the package', () => {
    scaffold(dir);
    const main = readFileSync(join(dir, 'src/main.tsx'), 'utf8');
    expect(main.split('\n').filter((line) => line.trim()).length).toBeLessThan(30);
    expect(main).toContain('renderManual');
    expect(main).toContain("import.meta.glob('../content/*/*.json'");
    expect(main).toContain("import.meta.glob('../content/media/*'");
  });

  it('writes a vite.config.ts that just spends the helper', () => {
    scaffold(dir);
    const config = readFileSync(join(dir, 'vite.config.ts'), 'utf8');
    expect(config).toContain('manualViteConfig');
    expect(config.split('\n').filter((line) => line.trim()).length).toBeLessThan(8);
  });

  it('writes a theme.css that overrides tokens unlayered, with no !important', () => {
    scaffold(dir);
    const theme = readFileSync(join(dir, 'src/theme.css'), 'utf8');
    expect(theme).toContain('--manual-brand');
    expect(theme).not.toContain('!important');
    expect(theme).not.toContain('@layer');
  });

  it("resets the page's own body margin, since the shell only styles its own subtree", () => {
    scaffold(dir);
    const theme = readFileSync(join(dir, 'src/theme.css'), 'utf8');
    expect(theme).toMatch(/body\s*\{[^}]*margin:\s*0/);
  });

  it('writes a manifest and a first chapter in both locales', () => {
    scaffold(dir);
    const manifest = JSON.parse(readFileSync(join(dir, 'content/manifest.json'), 'utf8'));
    expect(manifest.locales).toEqual(['ru', 'kk']);
    expect(manifest.chapters).toHaveLength(1);
    for (const locale of ['ru', 'kk']) {
      const chapter = JSON.parse(
        readFileSync(join(dir, `content/${locale}/01-getting-started.json`), 'utf8'),
      );
      expect(chapter.id).toBe('getting-started');
      expect(chapter.blocks.length).toBeGreaterThan(0);
    }
  });

  // The package is ESM only, so a consumer without this fails at `vite build`
  // with an error that points at rolldown rather than at the missing field.
  it('marks the generated package as ESM, which the shell requires', () => {
    scaffold(dir);
    const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'));
    expect(pkg.type).toBe('module');
  });

  it('wires validate and schema into the package scripts', () => {
    scaffold(dir);
    const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'));
    expect(pkg.scripts.validate).toBe('manual-kit validate');
    expect(pkg.scripts.schema).toBe('manual-kit schema');
    // A git URL, not a registry range: nothing is published to a registry, so
    // `^0.1.0` would 404 and a scaffolded manual could not install itself.
    expect(pkg.dependencies['@evrika/manual-kit']).toMatch(/^github:[\w-]+\/[\w-]+#v\d+\.\d+\.\d+$/);
  });

  it('refuses to overwrite a directory that already has a manual', () => {
    scaffold(dir);
    expect(() => scaffold(dir)).toThrow(/already/i);
  });
});
