import { useState } from 'react';
import type { AnyBlock } from '../content/types';
import type { ResolvedConfig } from '../config';
import { routeHref, type Route } from './route';
import { useManual } from './context';
import { SearchBox } from '../search/SearchBox';

/** Visual only: the button around it carries the accessible name. */
function ThemeIcon({ mode }: { mode: 'light' | 'dark' }) {
  if (mode === 'dark') {
    return (
      <svg
        className="theme-toggle-icon"
        viewBox="0 0 24 24"
        aria-hidden="true"
        focusable="false"
      >
        <path
          d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"
          fill="currentColor"
          stroke="none"
        />
      </svg>
    );
  }

  return (
    <svg
      className="theme-toggle-icon"
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  );
}

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
  effectiveTheme,
  onToggleTheme,
}: {
  config: ResolvedConfig<L, B>;
  route: Route<L>;
  onNavigate: (next: Route<L>) => void;
  onLocaleChange: (locale: L) => void;
  /**
   * Both or neither. A consumer composing `<Sidebar>` by hand can omit them
   * and get no theme control; `<Manual>` passes them only when
   * `config.themeToggle` is on.
   *
   * `system` is still a valid config default, so the value here is the *shown*
   * mode rather than the stored one: the moon/sun icon has to match the screen.
   */
  effectiveTheme?: 'light' | 'dark';
  onToggleTheme?: () => void;
}) {
  const strings = useManual().strings;
  const chapters = config.content.tableOfContents(route.locale);
  const [open, setOpen] = useState(false);

  const themeToggleLabel =
    effectiveTheme === 'dark'
      ? strings.themeSwitchToLight
      : strings.themeSwitchToDark;

  // Any navigation closes the panel: on a phone the chapter is underneath it.
  const onSearchNavigate = (next: Route<L>) => {
    setOpen(false);
    onNavigate(next);
  };

  return (
    <nav className="sidebar">
      <div className="sidebar-head">
        {config.slots.renderBrand?.(route) ??
          (config.brandImage ? (
            <img
              className="sidebar-brand-image"
              src={config.brandImage.src}
              alt={
                config.brandImage.alt ??
                (typeof config.brand === 'string' ? config.brand : '')
              }
            />
          ) : (
            <span className="sidebar-brand">{config.brand}</span>
          ))}

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

        {effectiveTheme !== undefined && onToggleTheme !== undefined && (
          <button
            type="button"
            className="theme-toggle"
            aria-label={themeToggleLabel}
            title={themeToggleLabel}
            onClick={onToggleTheme}
          >
            <ThemeIcon mode={effectiveTheme} />
          </button>
        )}

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
