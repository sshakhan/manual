import { useEffect } from 'react';
import type { AnyBlock } from '../content/types';
import type { ResolvedConfig } from '../config';
import { BlockList } from '../blocks/BlockList';
import { OnThisPage } from './OnThisPage';
import { anchorResolver, routeHref, type Route } from './route';
import { useManual } from './context';
import { useActiveSection } from './useActiveSection';

/**
 * Scrolls to the routed section after render, and highlights it briefly —
 * landing at the top of a long chapter with no clue which line you were sent to
 * is the usual failure of an anchored docs link.
 */
function useSectionScroll<L extends string>(route: Route<L>) {
  useEffect(() => {
    const { sectionId } = route;

    if (!sectionId) {
      window.scrollTo({ top: 0 });
      return;
    }

    const target = document.getElementById(sectionId);
    if (!target) return;

    target.scrollIntoView({ block: 'start' });
    target.classList.add('is-targeted');

    const timer = window.setTimeout(
      () => target.classList.remove('is-targeted'),
      1600,
    );
    return () => window.clearTimeout(timer);
  }, [route]);
}

/** The chapters either side of [chapterId], by title, for the foot of the page. */
function neighbours<L extends string, B extends AnyBlock>(
  config: ResolvedConfig<L, B>,
  route: Route<L>,
) {
  const chapters = config.content.tableOfContents(route.locale);
  const index = chapters.findIndex((chapter) => chapter.id === route.chapterId);

  return {
    previous: index > 0 ? chapters[index - 1] : undefined,
    next:
      index >= 0 && index < chapters.length - 1 ? chapters[index + 1] : undefined,
  };
}

export function ChapterView<L extends string, B extends AnyBlock>({
  config,
  route,
}: {
  config: ResolvedConfig<L, B>;
  route: Route<L>;
}) {
  const strings = useManual().strings;
  const loaded = config.content.loadChapter(route.locale, route.chapterId);

  // Hooks run before the early return below: a chapter that failed to load has
  // no sections, and an empty list is a state the hook already handles.
  const headingIds = (loaded?.chapter.blocks ?? [])
    .filter((block) => block.type === 'heading')
    .map((block) => block.id)
    .filter((id): id is string => id !== undefined);
  const activeId = useActiveSection(headingIds, route.sectionId);

  useSectionScroll(route);

  if (!loaded) {
    return (
      <main className="content">
        <p className="notice notice-warning">{strings.chapterMissing}</p>
      </main>
    );
  }

  const { chapter, isFallback } = loaded;
  const resolveAnchor = anchorResolver(route);
  const { previous, next } = neighbours(config, route);

  return (
    <>
      <main className="content">
        <article className="chapter">
          <h1 className="chapter-title">{chapter.title}</h1>

          {isFallback && (
            <p className="notice notice-info">{strings.fallbackNotice}</p>
          )}

          <BlockList
            blocks={chapter.blocks}
            registry={config.registry}
            resolveAnchor={resolveAnchor}
          />
        </article>

        <nav className="chapter-nav">
          {previous ? (
            <a
              className="chapter-nav-link chapter-nav-previous"
              href={routeHref({ locale: route.locale, chapterId: previous.id })}
            >
              <span className="chapter-nav-label">← {strings.previousChapter}</span>
              <span className="chapter-nav-title">{previous.title}</span>
            </a>
          ) : (
            <span />
          )}
          {next && (
            <a
              className="chapter-nav-link chapter-nav-next"
              href={routeHref({ locale: route.locale, chapterId: next.id })}
            >
              <span className="chapter-nav-label">{strings.nextChapter} →</span>
              <span className="chapter-nav-title">{next.title}</span>
            </a>
          )}
        </nav>

        {config.slots.renderChapterFooter?.(route)}
      </main>

      <OnThisPage blocks={chapter.blocks} route={route} activeId={activeId} />
    </>
  );
}
