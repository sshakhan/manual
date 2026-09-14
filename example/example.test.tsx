import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Manual, resolveConfig, buildEntries, search } from '../src/index';
import { exampleConfig } from './src/config';

// jsdom has no layout: `scrollTo` logs a "not implemented" error on every
// route change (`ChapterView` calls it to reset scroll), which would
// otherwise make this suite's output non-pristine.
vi.stubGlobal('scrollTo', vi.fn());

// `exampleConfig()` deliberately omits `root`: there is no #root in jsdom, and
// the browser entry is the only caller that has one.
const config = () =>
  resolveConfig({ ...exampleConfig(), root: document.createElement('div'), routing: 'memory' });

describe('the example manual', () => {
  it('resolves its config, including the locale the library knows nothing about', () => {
    const resolved = config();
    expect(resolved.locales.list).toEqual(['ru', 'kk', 'en']);
    expect(resolved.locales.labels.en).toBe('English');
    expect(resolved.locales.strings.en.onThisPage).toBe('On this page');
  });

  it('registers the custom block alongside the nine built-ins', () => {
    expect(config().registry.types()).toContain('shortcut');
    expect(config().registry.types()).toHaveLength(10);
  });

  it('renders its first chapter', () => {
    render(<Manual config={config()} />);
    expect(screen.getByRole('heading', { level: 1 })).toBeDefined();
  });

  it('renders the custom block where content uses it', () => {
    render(<Manual config={config()} />);
    expect(document.querySelector('.shortcut')).not.toBeNull();
  });

  it('finds the custom block by its text, so registry search works end to end', () => {
    const resolved = config();
    const entries = buildEntries(resolved.content.allChapters('ru'), resolved.registry);
    const hits = search(entries, 'ярлык', { minQueryLength: 2, maxResults: 30 });
    expect(hits.length).toBeGreaterThan(0);
  });

  it('shows the fallback notice on the chapter Kazakh does not have', () => {
    const resolved = config();
    const gap = resolved.content.manifest.chapters
      .map((entry) => entry.id)
      .find((id) => resolved.content.loadChapter('kk', id)?.isFallback);
    expect(gap, 'the example must keep one deliberate translation gap').toBeDefined();
  });

  it('uses every built-in block type somewhere, so the stylesheet is checkable', () => {
    const resolved = config();
    // `BlockRegistry.types()` returns plain `string[]` (the registry is built
    // from possibly-mixed specs), so this Set is widened at construction
    // rather than narrowed at the call below — `Set<B['type']>.has(string)`
    // does not typecheck under `strict`, and narrowing would need a cast.
    const used = new Set<string>(
      resolved.content.allChapters('ru').flatMap((chapter) => chapter.blocks.map((block) => block.type)),
    );
    for (const type of resolved.registry.types()) {
      expect(used.has(type), `no chapter uses "${type}"`).toBe(true);
    }
  });

  it('switches locale from the sidebar', async () => {
    render(<Manual config={config()} />);
    await userEvent.click(screen.getByRole('button', { name: 'English' }));
    expect(screen.getByText('On this page')).toBeDefined();
  });
});
