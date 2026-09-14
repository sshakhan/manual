import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * Guards the package's shape rather than its behaviour: an `exports` map that
 * points at a file the build does not produce fails only in a consumer's repo,
 * which is the worst place to find out.
 *
 * Run `npm run build` before this suite; it asserts on `dist/`.
 */
const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));

describe('package exports', () => {
  it.each([
    ['dist/index.js'], ['dist/index.d.ts'],
    ['dist/styles.css'], ['dist/vite.js'], ['dist/vite.d.ts'],
    ['dist/validate.js'], ['dist/validate.d.ts'],
  ])('produces %s', (path) => {
    expect(existsSync(new URL(`../${path}`, import.meta.url)), `${path} — run npm run build`).toBe(true);
  });

  it('does not bundle React', () => {
    const bundle = readFileSync(new URL('../dist/index.js', import.meta.url), 'utf8');
    expect(bundle).not.toContain('createContext=function');
    expect(bundle).toMatch(/from\s*["']react["']/);
  });

  it('keeps react and react-dom peer, never dependencies', () => {
    expect(Object.keys(pkg.dependencies ?? {})).not.toContain('react');
    expect(Object.keys(pkg.dependencies ?? {})).not.toContain('react-dom');
    expect(pkg.peerDependencies.react).toBeDefined();
    expect(pkg.peerDependencies['react-dom']).toBeDefined();
  });

  it('ships the stylesheet with every token in it', () => {
    const css = readFileSync(new URL('../dist/styles.css', import.meta.url), 'utf8');
    expect(css).toContain('--manual-brand');
    expect(css).toContain('@layer');
    expect(css).toContain('@container');
  });
});
