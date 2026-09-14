import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

/**
 * The payoff of the whole package: what a new manual actually costs.
 *
 * Templates live here as string constants rather than in a `templates/`
 * directory — `writeFileSync` of a template literal is simpler than a copy
 * step that has to be taught about the bundler, and none of these is close to
 * the ~40 lines where a separate file would start paying for itself.
 */

const MAIN_TSX = `import { renderManual } from '@evrika/manual-kit';
import '@evrika/manual-kit/styles.css';
import './theme.css';
import manifest from '../content/manifest.json';

renderManual({
  root: document.getElementById('root')!,
  brand: 'Название продукта',
  manifest,
  chapters: import.meta.glob('../content/*/*.json', { eager: true }),
  media: import.meta.glob('../content/media/*', {
    eager: true, query: '?url', import: 'default',
  }),
});
`;

const VITE_CONFIG_TS = `import { defineConfig } from 'vite';
import { manualViteConfig } from '@evrika/manual-kit/vite';

export default defineConfig(manualViteConfig());
`;

const INDEX_HTML = `<!doctype html>
<html lang="ru">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Руководство</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
`;

/**
 * Unlayered on purpose: the shell's own tokens live in `@layer tokens`, and
 * unlayered CSS always outranks every layer regardless of source order or
 * specificity — so this file wins with no `!important` and no knowledge of
 * the shell's layer order.
 */
const THEME_CSS = `:root {
  --manual-brand: oklch(60.5% 0.098 208);
}
`;

const MANIFEST_JSON = `{
  "version": 1,
  "locales": ["ru", "kk"],
  "chapters": [
    { "id": "getting-started", "file": "01-getting-started.json" }
  ]
}
`;

const CHAPTER_RU = `{
  "id": "getting-started",
  "title": "Начало работы",
  "blocks": [
    { "type": "heading", "level": 2, "id": "welcome", "text": "Добро пожаловать" },
    { "type": "paragraph", "text": "Отредактируйте эту главу и добавьте свои." }
  ]
}
`;

const CHAPTER_KK = `{
  "id": "getting-started",
  "title": "Жұмысты бастау",
  "blocks": [
    { "type": "heading", "level": 2, "id": "welcome", "text": "Қош келдіңіз" },
    { "type": "paragraph", "text": "Осы тарауды өңдеп, өзіңіздікін қосыңыз." }
  ]
}
`;

function packageJson(): string {
  return `${JSON.stringify(
    {
      name: 'manual',
      private: true,
      version: '0.1.0',
      type: 'module',
      scripts: {
        dev: 'vite',
        build: 'vite build',
        validate: 'manual-kit validate',
        schema: 'manual-kit schema',
      },
      dependencies: {
        '@evrika/manual-kit': '^0.1.0',
        react: '^18.3.1',
        'react-dom': '^18.3.1',
      },
      devDependencies: {
        '@vitejs/plugin-react': '^4.3.4',
        typescript: '^5.6.3',
        vite: '^5.4.11',
        'vite-plugin-singlefile': '^2.0.3',
      },
    },
    null,
    2,
  )}\n`;
}

/**
 * Writes a new manual into `dir`. Returns the paths written, for a caller
 * that wants to report them (`index.ts`'s `new-manual` command does).
 *
 * Refuses rather than overwrites when `content/manifest.json` already exists
 * — scaffolding twice into the same directory is almost always a mistake, and
 * silently clobbering real content is the wrong failure mode for it.
 */
export function scaffold(dir: string): string[] {
  const manifestPath = join(dir, 'content/manifest.json');
  if (existsSync(manifestPath)) {
    throw new Error(`manual-kit new-manual: ${dir} already has a manual (content/manifest.json exists)`);
  }

  const files: Record<string, string> = {
    'index.html': INDEX_HTML,
    'package.json': packageJson(),
    'vite.config.ts': VITE_CONFIG_TS,
    'src/main.tsx': MAIN_TSX,
    'src/theme.css': THEME_CSS,
    'content/manifest.json': MANIFEST_JSON,
    'content/ru/01-getting-started.json': CHAPTER_RU,
    'content/kk/01-getting-started.json': CHAPTER_KK,
  };

  const written: string[] = [];
  for (const [relativePath, contents] of Object.entries(files)) {
    const path = join(dir, relativePath);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, contents);
    written.push(path);
  }

  return written;
}
