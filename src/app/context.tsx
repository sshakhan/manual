import { createContext, useContext, type ReactNode } from 'react';
import type { UiStrings } from './strings';

export interface ManualContextValue {
  strings: UiStrings;
  resolveMedia: (src: string) => string | undefined;
}

const ManualContext = createContext<ManualContextValue | null>(null);

export function ManualProvider({
  value,
  children,
}: {
  value: ManualContextValue;
  children: ReactNode;
}) {
  return <ManualContext.Provider value={value}>{children}</ManualContext.Provider>;
}

export function useManual(): ManualContextValue {
  const value = useContext(ManualContext);
  if (!value) {
    throw new Error(
      'useManual: no ManualProvider above this component. Render <Manual> (or ' +
        'wrap your own layout in <ManualProvider>) — a shell without strings ' +
        'would render blank chrome, which is harder to diagnose than this.',
    );
  }
  return value;
}

/**
 * Turns the content path a chapter writes — `media/kaspi-qr.svg` — into the URL
 * the bundler produced.
 *
 * The keys of `config.media` are whatever `import.meta.glob` produced in the
 * *consumer's* file, so their prefix depends on where that file sits relative
 * to `content/` (`../content/media/…` from `src/main.tsx`, `../../content/…`
 * from a nested one). The library cannot know that prefix, so it matches on the
 * `media/` segment boundary instead of on a computed prefix — which is also why
 * a key ending in `xqr.svg` must not answer a request for `qr.svg`.
 */
export function createMediaResolver(
  media: Record<string, string> | undefined,
): (src: string) => string | undefined {
  if (!media) return () => undefined;

  const byContentPath = new Map<string, string>();
  for (const [key, url] of Object.entries(media)) {
    const at = key.lastIndexOf('/media/');
    if (at === -1) continue;
    byContentPath.set(key.slice(at + 1), url);
  }

  return (src) => byContentPath.get(src.replace(/^\.?\//, ''));
}
