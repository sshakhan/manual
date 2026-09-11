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
     * These two run under `node`, not the project-wide `jsdom`: both load
     * `@vitejs/plugin-react` at runtime, which calls esbuild. esbuild's
     * `TextEncoder` runs against Node's real `Uint8Array`, but jsdom's
     * environment installs its own `Uint8Array` in the global realm, so
     * esbuild's `instanceof` check compares a buffer from one realm against
     * the constructor from the other and rejects a perfectly good result.
     * Neither suite touches the DOM, so `node` sidesteps the mismatch.
     */
    environmentMatchGlobs: [['src/vite/**', 'node'], ['src/build.test.ts', 'node']],
    globals: true,
    include: ['src/**/*.test.{ts,tsx}', 'example/**/*.test.{ts,tsx}'],
    setupFiles: ['./vitest.setup.ts'],
  },
});
