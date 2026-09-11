import type { AnyBlock, HeadingBlock } from '../content/types';
import { routeHref, type Route } from './route';
import { useManual } from './context';

function headingsOf(blocks: AnyBlock[]): HeadingBlock[] {
  return blocks.filter((block): block is HeadingBlock => block.type === 'heading');
}

/**
 * The chapter's own sections, as a rail beside the text.
 *
 * A chapter is a flat array of blocks, so this is the only place the reader can
 * see its shape at all — chapter 7 is thirty-odd blocks, and without it the
 * only way to find «Обмен товара» is to scroll for it.
 *
 * It renders nothing for a chapter without headings rather than an empty
 * heading over a void; the layout drops to two columns for those.
 *
 * [activeId] comes from `useActiveSection` and is display only — the href is
 * what navigates, so a click routes through the hash like every other link in
 * the manual and stays copyable out of the address bar.
 */
export function OnThisPage<L extends string, B extends AnyBlock>({
  blocks,
  route,
  activeId,
}: {
  blocks: B[];
  route: Route<L>;
  activeId: string | undefined;
}) {
  // Hooks run before the early return below, same as in `ChapterView`: unlike
  // the reference's plain `ui()` call, `useManual()` is a real hook, and a
  // reader navigating from a chapter with headings to one without would keep
  // this same component instance mounted — calling it only on some renders
  // would violate the rules of hooks.
  const strings = useManual().strings;

  const headings = headingsOf(blocks);
  if (headings.length === 0) return null;

  return (
    <aside className="rail">
      <nav className="rail-inner" aria-label={strings.onThisPage}>
        <p className="rail-title">{strings.onThisPage}</p>

        <ol className="rail-list">
          {headings.map((heading) => (
            <li key={heading.id}>
              <a
                className={
                  heading.id === activeId ? 'rail-link rail-link-active' : 'rail-link'
                }
                data-level={heading.level}
                href={routeHref({
                  locale: route.locale,
                  chapterId: route.chapterId,
                  sectionId: heading.id,
                })}
                aria-current={heading.id === activeId ? 'true' : undefined}
              >
                {heading.text}
              </a>
            </li>
          ))}
        </ol>
      </nav>
    </aside>
  );
}
