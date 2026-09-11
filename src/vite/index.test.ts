import { describe, expect, it } from 'vitest';
import { manualViteConfig } from './index';

describe('manualViteConfig', () => {
  it('builds relative, so the artifact works from any subpath or from file://', () => {
    expect(manualViteConfig().base).toBe('./');
  });

  it('inlines assets, so the single file stays portable', () => {
    expect(manualViteConfig().build?.assetsInlineLimit).toBeGreaterThan(10_000_000);
  });

  it('disables publicDir, since content is imported rather than copied', () => {
    expect(manualViteConfig().publicDir).toBe(false);
  });

  it('defaults to dist and accepts another outDir', () => {
    expect(manualViteConfig().build?.outDir).toBe('dist');
    expect(manualViteConfig({ outDir: 'build' }).build?.outDir).toBe('build');
  });

  it('includes the single-file plugin by default and drops it on request', () => {
    const names = (config: ReturnType<typeof manualViteConfig>) =>
      (config.plugins ?? []).flat().map((plugin) => (plugin as { name?: string })?.name);
    expect(names(manualViteConfig())).toContain('vite:singlefile');
    expect(names(manualViteConfig({ singleFile: false }))).not.toContain('vite:singlefile');
  });

  it('includes the react plugin, so a consumer needs no plugin list at all', () => {
    const names = (manualViteConfig().plugins ?? []).flat()
      .map((plugin) => (plugin as { name?: string })?.name).join(' ');
    expect(names).toContain('react');
  });
});
