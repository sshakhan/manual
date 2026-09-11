import { useCallback, useEffect, useState } from 'react';
import { isLocaleOf, type AnyBlock } from '../content/types';
import type { ResolvedConfig } from '../config';
import { parseHash, routeHref, type Route } from './route';

/** The remembered locale, or the fallback. `localStorage` can throw — treat as absent. */
function storedLocale<L extends string>(
  key: string,
  locales: readonly L[],
  fallback: L,
): L {
  try {
    const value = window.localStorage.getItem(key);
    const isLocale = isLocaleOf(locales);
    return value && isLocale(value) ? value : fallback;
  } catch {
    return fallback;
  }
}

function rememberLocale(key: string, locale: string): void {
  try {
    window.localStorage.setItem(key, locale);
  } catch {
    // A till with storage disabled still gets a working manual, just no memory.
  }
}

/**
 * The current route.
 *
 * In `'hash'` routing it is kept in the URL hash: an empty hash is normalised
 * on mount to the remembered locale and the first chapter, so the address bar
 * always shows a link that can be copied and pasted — that is half the point
 * of routing a manual at all. In `'memory'` routing it is plain React state
 * that never touches `window.location`, which is what makes the shell
 * testable and embeddable where the URL is not ours to own.
 *
 * Both modes live in one hook rather than two: the caller should not care
 * which it is in, and a second hook is a second place for the locale-memory
 * logic to drift.
 */
export function useRoute<L extends string, B extends AnyBlock>(
  config: ResolvedConfig<L, B>,
): {
  route: Route<L>;
  navigate: (next: Route<L>) => void;
  setLocale: (locale: L) => void;
} {
  const { locales, routing } = config;
  const firstChapterId = config.content.chapterList()[0]?.id ?? '';
  const key = config.storageKey;

  const [route, setRoute] = useState<Route<L>>(() => {
    if (routing === 'memory') {
      return { locale: locales.fallback, chapterId: firstChapterId, sectionId: undefined };
    }

    const parsed = parseHash(window.location.hash, {
      locales: locales.list,
      fallback: locales.fallback,
      defaultChapterId: firstChapterId,
    });
    return window.location.hash
      ? parsed
      : { ...parsed, locale: storedLocale(key, locales.list, locales.fallback) };
  });

  useEffect(() => {
    if (routing === 'memory') return;

    const onHashChange = () =>
      setRoute(
        parseHash(window.location.hash, {
          locales: locales.list,
          fallback: locales.fallback,
          defaultChapterId: firstChapterId,
        }),
      );

    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, [routing, locales.list, locales.fallback, firstChapterId]);

  // Normalises an empty or partial hash into a full, shareable one.
  useEffect(() => {
    if (routing === 'memory') return;

    const canonical = routeHref(route);
    if (window.location.hash !== canonical) {
      window.location.replace(canonical);
    }
    // Only on mount: later navigations set the hash themselves.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const navigate = useCallback(
    (next: Route<L>) => {
      if (routing === 'memory') {
        setRoute(next);
        return;
      }
      window.location.hash = routeHref(next).slice(1);
    },
    [routing],
  );

  const setLocale = useCallback(
    (locale: L) => {
      if (routing !== 'memory') rememberLocale(key, locale);
      navigate({ ...route, locale });
    },
    [navigate, route, routing, key],
  );

  return { route, navigate, setLocale };
}
