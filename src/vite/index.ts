import type { UserConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

/**
 * The build config a manual wants, so each one's `vite.config.ts` is five
 * lines rather than thirty.
 *
 * The build is deliberately a single self-contained `dist/index.html`.
 *
 * A page opened over `file://` cannot `fetch()` its own JSON — the origin is
 * opaque in both WebView2 and WKWebView — so a normal multi-file build would
 * render an empty manual anywhere it is opened from disk. Everything (chapter
 * JSON included, via the eager glob the consumer passes as `config.chapters`)
 * is imported statically and inlined here instead.
 *
 * `assetsInlineLimit` is raised for the same reason: media becomes data URIs so
 * the one file stays portable. If a manual grows heavy screenshots and the HTML
 * gets unwieldy, pass `singleFile: false` and ship `dist/assets/` alongside —
 * but then the offline copy is a folder, not a file.
 */
export function manualViteConfig(
  options: { outDir?: string; singleFile?: boolean } = {},
): UserConfig {
  const { outDir = 'dist', singleFile = true } = options;

  return {
    base: './',
    publicDir: false,
    build: {
      outDir,
      emptyOutDir: true,
      assetsInlineLimit: 100_000_000,
      chunkSizeWarningLimit: 10_000,
    },
    plugins: singleFile ? [react(), viteSingleFile()] : [react()],
  };
}
