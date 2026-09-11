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

  // `color-scheme` has to be on the root element for `light-dark()` to resolve
  // anywhere below it, and the stylesheet reads this attribute rather than a
  // media query so a consumer's choice beats the reader's OS.
  useEffect(() => {
    document.documentElement.dataset.colorScheme = config.colorScheme;
  }, [config.colorScheme]);

  useEffect(() => {
    document.title = config.documentTitle(route);
    document.documentElement.lang = route.locale;
  }, [config, route]);

  return (
    <ManualProvider value={value}>
      {/* `.manual` is the container query root — the shell reflows by its own
          width, so it works embedded in a panel and not only full-page. */}
      <div className="manual">
        <Sidebar
          config={config}
          route={route}
          onNavigate={navigate}
          onLocaleChange={setLocale}
        />
        {/* Content and the rail are siblings of the sidebar: three columns on a
            wide window, and the rail moves above the text on a narrow one,
            purely in CSS. */}
        <ChapterView config={config} route={route} />
      </div>
    </ManualProvider>
  );
}
