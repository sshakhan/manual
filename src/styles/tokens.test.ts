// @vitest-environment node
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const tokens = readFileSync(new URL('./tokens.css', import.meta.url), 'utf8');
const manual = readFileSync(new URL('./manual.css', import.meta.url), 'utf8');

/** Every token a consumer's theme.css is documented to be able to override. */
const CONTRACT = [
  '--manual-brand', '--manual-brand-strong', '--manual-brand-tint',
  '--manual-text', '--manual-text-muted', '--manual-surface',
  '--manual-surface-alt', '--manual-line',
  '--manual-warning', '--manual-warning-tint', '--manual-danger',
  '--manual-danger-tint', '--manual-success', '--manual-success-tint',
  '--manual-font', '--manual-font-mono',
  '--manual-sidebar-width', '--manual-content-width', '--manual-rail-width',
  '--manual-radius', '--manual-radius-lg',
  '--manual-space-1', '--manual-space-2', '--manual-space-3',
  '--manual-space-4', '--manual-space-5', '--manual-space-6',
  '--manual-step-0', '--manual-step-1', '--manual-step-2', '--manual-step-3',
  '--manual-step-small', '--manual-step-tiny',
];

/*
 * There are deliberately no `--manual-breakpoint-*` tokens. CSS does not allow
 * a custom property inside a container-query condition, so a token there could
 * be overridden and change nothing — a worse outcome than not offering one,
 * because the consumer has no way to tell it did not work.
 */

describe('token contract', () => {
  it('declares every documented token', () => {
    for (const token of CONTRACT) {
      expect(tokens, token).toContain(`${token}:`);
    }
  });

  it('namespaces every custom property, so a consumer page cannot collide', () => {
    const declared = [...tokens.matchAll(/^\s*(--[a-z0-9-]+):/gm)].map((match) => match[1]!);
    expect(declared.length).toBeGreaterThan(0);
    for (const name of declared) {
      expect(name, name).toMatch(/^--manual-/);
    }
  });

  it('declares the layer order once, first, and exactly as specified', () => {
    expect(manual.trimStart()).toMatch(
      /^(\/\*[\s\S]*?\*\/\s*)?@layer tokens, base, layout, blocks, utilities, overrides;/,
    );
    expect([...manual.matchAll(/@layer tokens, base/g)]).toHaveLength(1);
  });

  it('derives brand tints from the brand rather than hardcoding them', () => {
    // `[\s\S]*?` rather than `\s*`: `light-dark()` wraps a light and a dark
    // `color-mix(...)` (see the dark-mode arithmetic in task 22's report), so
    // `color-mix(` no longer follows the colon directly.
    expect(tokens).toMatch(/--manual-brand-tint:[\s\S]*?color-mix\(/);
    expect(tokens).toMatch(/--manual-brand-strong:\s*color-mix\(/);
  });

  it('types the length tokens with @property, so a bad override degrades', () => {
    for (const token of ['--manual-sidebar-width', '--manual-content-width', '--manual-rail-width']) {
      expect(tokens, token).toMatch(new RegExp(`@property ${token}\\b`));
    }
  });

  it('reads the colour scheme from the attribute Manual sets', () => {
    // Quote-agnostic: CSS accepts either, and pinning one would make this a
    // style assertion rather than a behavioural one.
    expect(tokens).toMatch(/\[data-color-scheme=["']dark["']\]/);
    expect(tokens).toMatch(/\[data-color-scheme=["']system["']\]/);
  });

  it('uses container queries rather than viewport media queries for layout', () => {
    expect(manual).toContain('@container');
    expect(manual).toMatch(/container-name:\s*manual|container:\s*manual/);
    // Media queries are still right for preferences, never for layout width.
    for (const query of [...manual.matchAll(/@media[^{]+/g)].map((m) => m[0])) {
      expect(query, query).toMatch(/prefers-|print/);
    }
  });

  it('keeps every rule inside a layer, so unlayered consumer CSS wins', () => {
    const withoutComments = manual.replace(/\/\*[\s\S]*?\*\//g, '');
    const afterLayers = withoutComments.replace(/@layer [a-z, ]+;/, '');
    // Every top-level block must open a layer or an at-rule, never a bare selector.
    const topLevel = afterLayers.match(/^[^\s@}][^{]*\{/gm) ?? [];
    expect(topLevel).toEqual([]);
  });
});
