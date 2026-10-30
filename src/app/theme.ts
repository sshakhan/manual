/** The three values `colorScheme`/the theme switch accept. */
export type ThemeMode = 'light' | 'dark' | 'system';

const THEME_MODES: readonly ThemeMode[] = ['light', 'dark', 'system'];

function isThemeMode(value: string): value is ThemeMode {
  return (THEME_MODES as readonly string[]).includes(value);
}

/**
 * Keyed off the manual's own storage key, the same one that namespaces the
 * remembered locale — two manuals in one browser must not share a theme any
 * more than they share a language.
 */
export function themeStorageKey(storageKey: string): string {
  return `${storageKey}:theme`;
}

/**
 * The reader's last choice, or `undefined` when they have not made one.
 *
 * `localStorage` can throw outright in a locked-down webview, so it is treated
 * as absent rather than allowed to take the manual down on mount.
 */
export function storedTheme(key: string): ThemeMode | undefined {
  try {
    const value = window.localStorage.getItem(key);
    return value && isThemeMode(value) ? value : undefined;
  } catch {
    return undefined;
  }
}

/** A storage that refuses the write still gets a working switch, just no memory. */
export function rememberTheme(key: string, theme: ThemeMode): void {
  try {
    window.localStorage.setItem(key, theme);
  } catch {
    // Ignored on purpose.
  }
}

/**
 * What the OS is asking for right now.
 *
 * `matchMedia` is absent in some test environments and very old webviews, and
 * a missing query is the same as a light preference for our purposes.
 */
export function systemPrefersDark(): boolean {
  return typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-color-scheme: dark)').matches
    : false;
}

/**
 * The explicit mode a one-click light/dark toggle should move to.
 *
 * From `'system'` it has to look at the OS, not at the stored string: if the
 * reader's system is already dark, "toggle" must mean light, otherwise the
 * first click would appear to do nothing.
 */
export function nextExplicitTheme(
  theme: ThemeMode,
  prefersDark: boolean,
): 'light' | 'dark' {
  if (theme === 'dark') return 'light';
  if (theme === 'light') return 'dark';
  return prefersDark ? 'light' : 'dark';
}
