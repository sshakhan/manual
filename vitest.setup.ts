/**
 * Node 22+ defines its own lazy, inert `localStorage` global (it throws an
 * experimental-feature warning and stays `undefined` without a
 * `--localstorage-file`). Vitest's jsdom environment predates that global, so
 * its "only copy a jsdom key onto `global` if Node doesn't already have one"
 * check sees Node's `localStorage` and skips copying jsdom's real one —
 * `window.localStorage` then resolves to Node's inert version instead of
 * jsdom's working `Storage`. Point it at jsdom's instance explicitly so any
 * test that uses `window.localStorage` gets a real, working store.
 */
const jsdomGlobal = (globalThis as { jsdom?: { window: { localStorage: Storage } } }).jsdom;
if (jsdomGlobal) {
  Object.defineProperty(globalThis, 'localStorage', {
    value: jsdomGlobal.window.localStorage,
    configurable: true,
  });
}
