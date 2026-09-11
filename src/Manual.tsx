import { useEffect, useMemo } from 'react';
import type { AnyBlock } from './content/types';
import type { ResolvedConfig } from './config';
import { ManualProvider } from './app/context';
import { Sidebar } from './app/Sidebar';
import { ChapterView } from './app/ChapterView';
import { useRoute } from './app/useRoute';

/**
 * The whole shell: three columns and the document-level state that goes with
 * them.
 *
 * The `colorScheme` attribute, the title and `<html lang>` are set here rather
 * than in `renderManual`, so they keep working for a consumer who renders
 * `<Manual>` inside a larger React app instead of calling `renderManual`.
 */
export function Manual<L extends string, B extends AnyBlock>({
  config,
}: {
  config: ResolvedConfig<L, B>;
}) {
  const { route, navigate, setLocale } = useRoute(config);

  const strings = config.locales.strings[route.locale];
  const value = useMemo(
    () => ({ strings, resolveMedia: config.resolveMedia }),
    [strings, config.resolveMedia],
  );

  /*
   * Put the document back the way it was found, on unmount.
   *
   * Captured once on mount rather than per navigation: a cleanup that ran on
   * every route change would restore the *previous chapter's* title, so a host
   * app unmounting the shell would inherit whatever chapter the reader happened
   * to leave on. Embedding is the whole reason these effects live here rather
   * than in `renderManual`, and a shell that permanently rewrites its host's
   * title, language and colour scheme is not embeddable.
   *
   * It runs before the two setters below, so it captures the pre-mount values.
   */
  useEffect(() => {
    const root = document.documentElement;
    const before = {
      title: document.title,
      lang: root.lang,
      colorScheme: root.dataset.colorScheme,
    };

    return () => {
      document.title = before.title;
      root.lang = before.lang;
      if (before.colorScheme === undefined) delete root.dataset.colorScheme;
      else root.dataset.colorScheme = before.colorScheme;
    };
  }, []);

  // `color-scheme` has to be on the root element for `light-dark()` to resolve
  // anywhere below it, and the stylesheet reads this attribute rather than a
  // media query so a consumer's choice beats the reader's OS.
  useEffect(() => {
    document.documentElement.dataset.colorScheme = config.colorScheme;
  }, [config.colorScheme]);

  useEffect(() => {
    document.title = config.documentTitle(route);
    document.documentElement.lang = route.locale;
  }, [config.documentTitle, route]);

  return (
    <ManualProvider value={value}>
      {/*
        `.manual` establishes the container; `.manual-layout` is what reflows.
        Two elements, not one, because an element can never be the subject of
        its own container query — the query resolves against ancestors, so a
        `.manual` that both declares `container: manual` and queries it for
        its own `display` would simply never match, and the shell would stay
        a three-column row at every width.
      */}
      <div className="manual">
        <div className="manual-layout">
          <Sidebar
            config={config}
            route={route}
            onNavigate={navigate}
            onLocaleChange={setLocale}
          />
          {/* Content and the rail are siblings of the sidebar: three columns
              on a wide window, and the rail moves above the text on a narrow
              one, purely in CSS. */}
          <ChapterView config={config} route={route} />
        </div>
      </div>
    </ManualProvider>
  );
}
