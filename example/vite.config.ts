import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import { manualViteConfig } from '../src/vite/index';

// The example imports the package by name but resolves to source, so it tracks
// what is being written rather than the last build.
//
// Two entries, not one: Vite's alias matching is a prefix match, so a single
// `'@evrika/manual-kit'` entry also catches `'@evrika/manual-kit/styles.css'`
// and rewrites it to `<src/index.ts>/styles.css` — not a directory, so the
// build fails. The subpath is listed first and matched in full, before the
// bare specifier's prefix match gets a chance at it.
export default defineConfig({
  ...manualViteConfig(),
  root: resolve(__dirname),
  resolve: {
    alias: {
      '@evrika/manual-kit/styles.css': resolve(__dirname, '../src/styles/manual.css'),
      '@evrika/manual-kit': resolve(__dirname, '../src/index.ts'),
    },
  },
});
