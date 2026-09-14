import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import { manualViteConfig } from '../src/vite/index';

// The example imports the package by name but resolves to source, so it tracks
// what is being written rather than the last build.
//
// Three entries, not one: Vite's alias matching is a prefix match, so a bare
// `'@evrika/manual-kit'` entry also catches every subpath
// (`'@evrika/manual-kit/styles.css'`, `'@evrika/manual-kit/validate'`) and
// rewrites each to a path under `<src/index.ts>` — not a directory, so
// resolution fails. Each subpath is listed first and matched in full, before
// the bare specifier's prefix match gets a chance at it. This config is also
// what `example/validate.ts` runs under (`vite-node --config
// example/vite.config.ts`), which is why `/validate` needs an entry here too.
export default defineConfig({
  ...manualViteConfig(),
  root: resolve(__dirname),
  resolve: {
    alias: {
      '@evrika/manual-kit/styles.css': resolve(__dirname, '../src/styles/manual.css'),
      '@evrika/manual-kit/validate': resolve(__dirname, '../src/cli/public.ts'),
      '@evrika/manual-kit': resolve(__dirname, '../src/index.ts'),
    },
  },
});
