import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import dts from 'vite-plugin-dts';

export default defineConfig({
  plugins: [
    react(),
    // rollupTypes: without it, dts mirrors src/'s directory tree (e.g.
    // dist/vite/index.d.ts), but the lib build's flat entry names produce
    // dist/vite.js — rollupTypes bundles each entry's types to match.
    dts({ include: ['src'], exclude: ['src/**/*.test.*'], rollupTypes: true }),
  ],
  build: {
    lib: {
      entry: {
        index: resolve(__dirname, 'src/index.ts'),
        vite: resolve(__dirname, 'src/vite/index.ts'),
        styles: resolve(__dirname, 'src/styles/index.ts'),
        'cli/index': resolve(__dirname, 'src/cli/index.ts'),
        // A separate entry rather than part of the main barrel: it imports
        // `ajv`, and a build-time validator has no business being pulled into
        // every consumer's browser bundle.
        validate: resolve(__dirname, 'src/cli/public.ts'),
      },
      formats: ['es'],
    },
    rollupOptions: {
      external: ['react', 'react-dom', 'react-dom/client', 'react/jsx-runtime',
                 'ajv', 'node:fs', 'node:path', 'node:url', 'node:process',
                 'vite', '@vitejs/plugin-react', 'vite-plugin-singlefile'],
      output: { assetFileNames: 'styles.css' },
    },
    sourcemap: true,
    emptyOutDir: true,
  },
  test: {
    environment: 'jsdom',
    /*
     * These run under `node`, not the project-wide `jsdom`: `src/vite/**` and
     * `src/build.test.ts` both load `@vitejs/plugin-react` at runtime, which
     * calls esbuild. esbuild's `TextEncoder` runs against Node's real
     * `Uint8Array`, but jsdom's environment installs its own `Uint8Array` in
     * the global realm, so esbuild's `instanceof` check compares a buffer from
     * one realm against the constructor from the other and rejects a
     * perfectly good result.
     *
     * `src/cli/**` and `src/docs.test.ts` need `node` for an unrelated
     * reason: jsdom virtualises `import.meta.url` to something that is not a
     * `file:` URL, so `new URL(..., import.meta.url)` resolves against
     * `http://localhost:3000` instead of the filesystem — the CLI tests hit
     * this locating their fixtures, and `docs.test.ts` hits it the same way
     * reading `README.md` and `docs/tokens.md`. None of these suites touch
     * the DOM, so `node` sidesteps both problems.
     */
    environmentMatchGlobs: [
      ['src/vite/**', 'node'],
      ['src/build.test.ts', 'node'],
      ['src/cli/**', 'node'],
      ['src/docs.test.ts', 'node'],
    ],
    globals: true,
    include: ['src/**/*.test.{ts,tsx}', 'example/**/*.test.{ts,tsx}'],
    setupFiles: ['./vitest.setup.ts'],
  },
});
