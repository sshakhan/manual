import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import type { AnyBlock } from './content/types';
import type { ResolvedConfig } from './config';
import { ManualProvider } from './app/context';
import { Sidebar } from './app/Sidebar';
import { ChapterView } from './app/ChapterView';
import { useRoute } from './app/useRoute';
import {
  nextExplicitTheme,
  rememberTheme,
  storedTheme,
  systemPrefersDark,
  type ThemeMode,
} from './app/theme';

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
   * The reader's choice wins over `config.colorScheme`, but only when the
   * switch is available: a consumer who fixed the scheme on purpose should
   * not be overridden by a preference left behind in localStorage by some
   * earlier version of the manual.
   */
  const [theme, setTheme] = useState<ThemeMode>(
    () =>
      (config.themeToggle ? storedTheme(config.themeStorageKey) : undefined) ??
      config.colorScheme,
  );

  const changeTheme = useCallback(
    (next: ThemeMode) => {
      rememberTheme(config.themeStorageKey, next);
      setTheme(next);
    },
    [config.themeStorageKey],
  );

  /*
   * A one-click toggle still has to know whether the screen is in dark mode
   * when the stored choice is `'system'` — otherwise the first click from a
   * dark OS would "switch to dark" and do nothing visible. Track the OS query
   * only while `'system'` is selected.
   */
  const [systemDark, setSystemDark] = useState(systemPrefersDark);

  useEffect(() => {
    if (theme !== 'system' || typeof window.matchMedia !== 'function') return;

    const query = window.matchMedia('(prefers-color-scheme: dark)');
    const sync = () => setSystemDark(query.matches);
    sync();
    query.addEventListener?.('change', sync);

    return () => query.removeEventListener?.('change', sync);
  }, [theme]);

  const effectiveTheme: 'light' | 'dark' =
    theme === 'system' ? (systemDark ? 'dark' : 'light') : theme;

  const toggleTheme = useCallback(() => {
    changeTheme(
      nextExplicitTheme(
        theme,
        theme === 'system' ? systemPrefersDark() : systemDark,
      ),
    );
  }, [changeTheme, theme, systemDark]);

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
   * A layout effect, like the colour-scheme setter below, and declared before
   * it: layout effects run in declaration order, so this one sees the document
   * untouched. As a passive effect it would run *after* the setter and
   * "restore" the value the shell itself had just written.
   */
  useLayoutEffect(() => {
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

  /*
   * `color-scheme` has to be on the root element for `light-dark()` to resolve
   * anywhere below it, and the stylesheet reads this attribute rather than a
   * media query so the reader's (or consumer's) choice beats the OS.
   *
   * Layout effect, not effect: `useEffect` runs after paint, which means a
   * reader whose stored choice is dark sees one white frame before the
   * attribute lands. This is a client-only shell (`renderManual` creates a
   * root), so there is no server render for `useLayoutEffect` to warn about.
   */
  useLayoutEffect(() => {
    document.documentElement.dataset.colorScheme = theme;
  }, [theme]);

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
            effectiveTheme={config.themeToggle ? effectiveTheme : undefined}
            onToggleTheme={config.themeToggle ? toggleTheme : undefined}
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
