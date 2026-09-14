# Example manual

The integration fixture and the proof the abstraction holds. Not a
hello-world: it deliberately exercises the three things migration deferred —
an unknown-to-the-library locale, a translation gap, and a second-party
block.

- **Locales**: `ru`, `kk`, `en`. `en` is not one of the library's built-in
  locales (`BUILTIN_LOCALES` is `['ru', 'kk']`), so its labels and UI strings
  come entirely from `example/src/config.ts` — the unknown-locale path is
  exercised by real content, not a test double.
- **Translation gap**: `content/kk/02-shortcuts.json` does not exist. The
  manifest lists three chapters for every locale, but Kazakh only has files
  for chapters 1 and 3 — chapter 2 in Kazakh falls back to Russian and shows
  the fallback notice. A missing file cannot carry an explanatory comment,
  which is why this paragraph is that comment.
- **Custom block**: `shortcut` (`example/src/blocks/shortcut.tsx`), registered
  from outside the package via `createRegistry([...builtinBlocks, shortcutBlock])`
  in `config.ts`. It renders, it is searchable, and `manual-kit validate`
  rejects it under the *default* registry (proof the check works) but passes
  under the example's own registry — see `validate.ts` and `npm run
  example:validate`.
- **Every built-in block type** is used at least once across the three
  chapters, so the stylesheet is checkable in one pass.

Run it with `npm run example`, validate its content with `npm run
example:validate`, and test it with `npx vitest run example`.
