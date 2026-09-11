import { useState } from 'react';
import type { AnyBlock } from '../content/types';
import type { ResolvedConfig } from '../config';
import { routeHref, type Route } from './route';
import { useManual } from './context';
import { SearchBox } from '../search/SearchBox';

/**
 * Table of contents, search and the language switch.
 *
 * On a narrow window this is the whole header: it sticks to the top and the
 * body (search + chapters) collapses behind a toggle. Without collapsing, a
 * phone reader scrolls past twelve chapter links before reaching a word of the
 * chapter they opened. `open` is only consulted below the 900px breakpoint —
 * on desktop the CSS shows the body unconditionally, so the state can stay
 * `false` there and never has to track the viewport.
 */
export function Sidebar<L extends string, B extends AnyBlock>({
  config,
  route,
  onNavigate,
  onLocaleChange,
}: {
  config: ResolvedConfig<L, B>;
  route: Route<L>;
  onNavigate: (next: Route<L>) => void;
  onLocaleChange: (locale: L) => void;
}) {
  const strings = useManual().strings;
  const chapters = config.content.tableOfContents(route.locale);
  const [open, setOpen] = useState(false);

  // Any navigation closes the panel: on a phone the chapter is underneath it.
  const onSearchNavigate = (next: Route<L>) => {
    setOpen(false);
    onNavigate(next);
  };

  return (
    <nav className="sidebar">
      <div className="sidebar-head">
        {config.slots.renderBrand?.(route) ?? (
          <span className="sidebar-brand">{config.brand}</span>
        )}

        <div className="locale-switch" role="group" aria-label={strings.languageGroup}>
          {config.locales.list.map((locale) => (
            <button
              key={locale}
              type="button"
              className={
                locale === route.locale
                  ? 'locale-button locale-button-active'
                  : 'locale-button'
              }
              onClick={() => onLocaleChange(locale)}
            >
              {config.locales.labels[locale]}
            </button>
          ))}
        </div>

        <button
          type="button"
          className="sidebar-toggle"
          aria-expanded={open}
          aria-controls="sidebar-body"
          aria-label={open ? strings.closeSections : strings.openSections}
          onClick={() => setOpen((wasOpen) => !wasOpen)}
        >
          <span className="sidebar-toggle-bars" aria-hidden="true" />
        </button>
      </div>

      <div className="sidebar-body" id="sidebar-body" data-open={open}>
        <SearchBox config={config} route={route} onNavigate={onSearchNavigate} />

        <ol className="toc">
          {chapters.map((chapter, index) => (
            <li key={chapter.id}>
              <a
                className={
                  chapter.id === route.chapterId
                    ? 'toc-link toc-link-active'
                    : 'toc-link'
                }
                href={routeHref({ locale: route.locale, chapterId: chapter.id })}
                onClick={() => setOpen(false)}
              >
                <span className="toc-number">{index + 1}</span>
                <span className="toc-title">{chapter.title}</span>
              </a>
            </li>
          ))}
        </ol>

        {config.slots.renderSidebarFooter?.(route)}
      </div>
    </nav>
  );
}
