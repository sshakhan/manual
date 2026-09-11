import { isLocaleOf } from '../content/types';
import type { RouteContext } from './route-types';

/**
 * Hash routing: `#/:locale/:chapter/:section?`.
 *
 * Hash rather than history so the built file is a plain static artifact — it
 * works from any subpath, from a share, and from a `file://` path with no
 * server rewrite rules. That last one is not optional: the offline copy is
 * opened straight off disk.
 */
export type Route<L extends string> = RouteContext<L>;

export function routeHref<L extends string>(route: Route<L>): string {
  const { locale, chapterId, sectionId } = route;
  return `#/${locale}/${chapterId}${sectionId ? `/${sectionId}` : ''}`;
}

/**
 * Turns an inline link target into a route hash, relative to [route].
 *
 * `section` stays in the current chapter; `chapter/section` crosses to another
 * one. Both forms exist because a bare `#section` written for another chapter
 * resolves against the chapter the reader is standing in — a wrong link rather
 * than a broken one, which is exactly the kind that survives review.
 */
export function anchorResolver<L extends string>(route: Route<L>): (target: string) => string {
  return (target) => {
    // `split` never returns an empty array, so `first` is always present —
    // only `second` (present when the target names another chapter) can be
    // absent. The default narrows the type without asserting past it.
    const [first = '', second] = target.split('/');

    return second === undefined
      ? routeHref({ ...route, sectionId: first })
      : routeHref({ locale: route.locale, chapterId: first, sectionId: second });
  };
}

export function parseHash<L extends string>(
  hash: string,
  options: { locales: readonly L[]; fallback: L; defaultChapterId: string },
): Route<L> {
  const isLocale = isLocaleOf(options.locales);
  const [locale, chapterId, sectionId] = hash
    .replace(/^#\/?/, '')
    .split('/')
    .filter((segment) => segment !== '');

  return {
    locale: locale && isLocale(locale) ? locale : options.fallback,
    chapterId: chapterId || options.defaultChapterId,
    sectionId: sectionId || undefined,
  };
}
