# Decisions taken during implementation

Thirty-one design rulings were made while building this package, each because the
implementation met something the plan got wrong or did not anticipate. They are recorded here
because the *reasoning* for most of them exists nowhere in the code — a comment can say what a
line does, but not which alternative was rejected and why.

Each entry states the decision, the evidence it rested on, and what it costs if it turns out to
be wrong. One of them — the translation-gap downgrade under Task 22 — was subsequently judged
wrong by the final whole-branch review and corrected; it is kept here with that outcome noted,
because a decision that had to be reversed is more instructive than one that held.

Generated from the implementation ledger.

---

Ruling: work in-place on branch `build-manual-kit`, not a git worktree — every
Task 1: Ruling: the missing `"private": false` is a real miss and gets fixed now, not deferred.
  The reviewer rated it Minor and functionally inert (npm treats an absent `private` as
  publishable, so behaviour is identical) and traced it to the brief's own template rather than
  to the implementer — both correct. I am fixing it anyway: it is a Global Constraint, the spec's
  distribution decision is a *published* package, and package.json is not touched again until
  Task 19, so an unresolved publishability flag would resurface at publish time instead. One word,
  and it keeps 22 remaining tasks from inheriting a precedent that stated constraints are optional.
  The plan's Task 1 template has been amended so the constraint and the template now agree.
  Cost if wrong: one extra fix round on a field with no runtime effect.
Task 3: Ruling: `createRegistry` takes `readonly BlockSpec<any>[]`, not `BlockSpec<never>[]`.
  The plan's comment claimed `BlockSpec<T>` is contravariant in T; it is not — it is
  **invariant**, using T covariantly through `type: T['type']` and contravariantly through
  `component`/`searchText`. So no concrete element type accepts a heterogeneous list:
  `AnyBlock` fails on `component`, `never` fails on `type` (`'note'` is not assignable to
  `never` — the exact error the implementer hit, TS2322 ×9). `any` is the only element type
  that works. It costs nothing where it matters: `defineBlock<T>` still type-checks each spec
  fully at its definition site, the only place a spec is written, and the registry past that
  point only reads `.type`.
  Verified before re-dispatch: a scratch reproduction in /tmp/variance-check compiled clean
  under `--strict` for all four downstream call shapes — bare heterogeneous, explicitly
  annotated `<A|B>`, a `readonly BlockSpec<any>[]` constant, and a spread of that constant
  plus a custom spec.
  Side benefit: this *removes* casts rather than adding them. The plan's
  `builtinBlocks ... as unknown as readonly BlockSpec<never>[]` becomes a plain annotation, the
  internal `as unknown as BlockSpec<B>` becomes `as BlockSpec<B>`, and four `noteBlock as never`
  casts in Tasks 14/20/22 are gone. Plan and spec both patched, so Tasks 10/14/20/22 inherit it.
  Cost if wrong: `any` erases the element type inside `createRegistry`; a spec whose three
  members disagree with each other would not be caught there. It is caught at `defineBlock<T>`,
  and `manual-kit validate` (Task 20) catches the content-side consequence.
Task 4: Ruling: narrow the regex capture groups; do not assert them. `noUncheckedIndexedAccess`
  is on in this repo and off in both reference repos, so ported code reads `link[1]`/`link[2]` as
  `string | undefined`. The fix is `if (bold?.[1])` and `if (link?.[1] && link[2])`, not `!`.
  Verified before ruling: compiles clean under `--strict --noUncheckedIndexedAccess`, and both
  groups are `+`-quantified so a matched group can never be the empty string — truthiness
  narrowing is therefore exactly equivalent to an existence check, with no behaviour change
  (confirmed `[](#b)` does not match the pattern at all).
  Generalised into a new Global Constraint so the remaining 18 tasks handle it the same way, and
  pre-emptively applied to the one other site I could find by inspection: `search/index.ts`
  `score()` reads `haystack[at - 1]` into `RegExp.test`, guarded by an `at === 0` short-circuit
  that the compiler cannot see. Task 14's text now carries the narrowing.
  Cost if wrong: none — narrowing is strictly safer than the assertion it replaces.
Task 6: Ruling: `createMediaResolver` takes one parameter. The Interfaces block advertised a
  second, `contentBase?: string`, which is vestigial — it survived from an earlier draft that
  computed a prefix, and matching on the `/media/` segment boundary is exactly what removed the
  need for a base path. The Step 3 code and all five tests use one parameter, so the implementer
  chose the executable spec over the stale prose, which is right. Plan's Interfaces line fixed.
  Cost if wrong: none — a second parameter would have been dead on arrival, unused by every
  call site in Tasks 9, 12 and 22.
Task 7: Ruling on the Important (plan-mandated cast in text.test.tsx): the reviewer was right to
  flag it rather than exempt it for being mine. Resolved two ways, because both are true:
  (a) the "narrow, never assert" constraint is about production code — a test asserting on
  `JsonSchema`, which is `Record<string, unknown>` *by design* since the library does not model
  JSON Schema, has nothing to narrow, and `typeof` guards there would bury the assertion. The
  constraint now says non-test files, matching how the Cyrillic rule is scoped.
  (b) the cast was avoidable anyway. `toMatchObject` with `expect.arrayContaining` asserts all
  three properties in one matcher, cast-free, and is *stronger* than the three separate reads it
  replaces. Verified in-repo before ruling: passes, typechecks clean. Plan patched; going into a
  fix round so the landed test matches.
  Cost if wrong: none in (b). In (a), a genuinely sloppy cast in a future test would no longer
  trip the constraint — accepted, since reviewers still judge test quality on its merits.
Task 8: Ruling: `Callout` renders `callout callout-${variant}`, per the reference. My Task 8 test
  asserted `.notice-${variant}` and the implementer correctly built to the test. Verified in the
  reference stylesheet that this matters: `.callout-danger` and `.callout-success` exist,
  `.notice-danger`/`.notice-success` do **not** — `.notice` only ever carries `info` and
  `warning`, because its only two uses are `ChapterView`'s fallback and chapter-missing messages.
  A danger or success callout rendered as `.notice-*` would silently fall back to base teal and
  lose its red/green semantics. They are two families: `.callout` is authored content, `.notice`
  is shell chrome.
  Knock-on defect found while ruling: Task 18's class list and verification grep omitted the
  whole `callout*` family, so the rewritten stylesheet would have left it unstyled and the grep
  would not have caught it. Both fixed, plus a note in Task 18 telling the implementer not to let
  the shorter family swallow the longer one.
  Cost if wrong: none — this restores documented reference behaviour.
Task 10: Ruling: the error is in my brief's test, not the implementation. `builtin/index.ts` is
  correct as written. At BlockList.test.tsx:96 an inline `blocks={[...]}` array literal widens to
  a structural type, so TS infers `B` from `blocks` rather than letting it agree with
  `defaultRegistry`, and `BlockRegistry<BuiltinBlock>` then fails to match. Fix is to annotate a
  local `const mixed: BuiltinBlock[]` — the same thing the file's first test already does — and
  pass that. No cast needed. Verified in-repo before ruling (typecheck clean, 6/6 pass), then
  reverted so the implementer owns the edit. Plan patched.
  Cost if wrong: none; it is a test-local annotation matching the pattern already used two tests
  above it.
Task 12: Ruling A (control flow): `resolveConfig` checked the display label before computing the
  missing UI strings, so a locale the library bundles nothing for reported only the label — and
  my own test asserted it should name every missing key. Rather than merely swapping the two
  checks, the strings are now computed first and folded into the label error, so **both problems
  surface in one run**. That is the case a consumer adding a locale actually hits (both wrong at
  once), and it satisfies all four locale-related tests without reordering which error wins.
  Verified in-repo before ruling: typecheck clean, 18/18 pass. Reverted afterwards so the
  implementer owns the edit.
  Cost if wrong: the label error grows a sentence; no behavioural risk.
Task 12: Ruling B (types): the test that builds an `'en'` locale casts the whole config
  `as never`, which widens `L` to `string`, making `strings.en` an index access that
  `noUncheckedIndexedAccess` types as possibly undefined. Fixed with optional chaining in the
  assertion, which still fails loudly if the value really is absent — rather than by unpicking
  the `as never`, which is doing deliberate work in that test.
  Cost if wrong: none; the assertion is strictly no weaker.
Task 12: Ruling: the Important is mine and gets fixed — `const fallback = ... ?? list[0]!` is a
  bare assertion my own constraint forbids and which I had asked reviewers to catch. Logically
  safe (guarded by the empty-list throw) but invisibly so. Replaced the `list.length === 0` guard
  with a destructure that narrows, giving the same check and message with no assertion. Verified:
  typecheck clean, 90/90, zero `!` left in config.ts.
Task 11: Ruling on the subdirectory Minor: keep `slice(-2)` — it is what makes the consumer's
  unknown glob prefix workable — but document the flat-filename assumption, and move real
  enforcement to `manual-kit validate`. Added that check to Task 20 (message, fixture case and an
  `it.each` row) so the comment is not a cheque nobody cashes. The reviewer was right that the
  failure mode is deceptive: a subdirectory in `file` loses the locale segment, so the chapter
  reads as untranslated in every locale rather than as misconfigured.
Task 14: Ruling A (`toHaveValue`): do **not** add `@testing-library/jest-dom`. It would be a new
  devDependency for a single assertion, and `screen.getByRole<HTMLInputElement>('searchbox').value`
  reads the same, needs no cast, and adds nothing to install. Testing Library's query generics are
  the intended escape hatch here.
Task 14: Ruling B (ambiguous `getByText(/Оплата/)`): the fixture is right and the assertion was
  wrong. Both the heading and the paragraph under it contain «QR», so a search for it legitimately
  returns two hits, each rendering «Оплата · Kaspi QR» — the ambiguity is the fixture behaving
  correctly. Assert the first hit's shape instead, which also tests something the old assertion
  did not: that a hit names chapter *and* section, so a reader can see where it lands.
  Both verified in-repo before ruling: SearchBox 7/7, typecheck clean. Reverted afterwards so the
  implementer owns the edits. Plan patched.
  Cost if wrong: none; both assertions are strictly more specific than what they replace.
Task 13: Ruling on the Important (mine): the brand-slug key defeats its own purpose. A ReactNode
  brand always slugs to 'default' and a punctuation-only brand to nothing, so two manuals branded
  with a JSX logo share one key and fight over the reader's language — precisely the bug the
  per-manual key was introduced to fix. `storageKey` becomes config, derived in `resolveConfig`
  beside every other default, with a slug that degrades to 'default' only when it genuinely
  cannot do better; `useRoute` reads it rather than deriving it.
  Cost if wrong: one more config knob. The alternative — hashing a React element — is not
  meaningful, and silently colliding is worse than asking the consumer who knows their own
  manual's identity.
Task 16: Ruling on the Important: split the first/last-chapter test in two. The reviewer is right
  that it currently passes by coincidental arithmetic — `toHaveLength(1)` sums 1 from the
  first-chapter tree and 0 from the last-chapter tree across two trees mounted in one document,
  so it is green while measuring the wrong thing. My brief had said to split it; the implementer
  did not, and did not list it among its three disclosed deviations. Plan patched with both the
  split tests and a sharper statement of why.
  Cost if wrong: none — two tests assert strictly more than the one they replace.
Task 17: Ruling A: wrap the mount in `act()`, do **not** make `renderManual` flush synchronously.
  `createRoot().render()` schedules concurrently, so the mount is not observable on the next line
  — but that is the test's problem. A `flushSync` inside `renderManual` would make every consumer
  pay for this test's convenience and would forfeit concurrent rendering for a library whose whole
  job is rendering a static document.
Task 17: Ruling B: annotate the custom-title callback's parameter. The `Record<string, unknown>`
  + `as never` override pattern leaves a destructured callback parameter implicitly `any`
  (TS7031); no earlier test happened to pass a callback through it.
Task 17: Ruling C: add `vi.stubGlobal('scrollTo', ...)`, matching ChapterView.test.tsx — jsdom
  implements no `scrollTo` and `ChapterView` calls it on every route change, so the run was
  green but not silent.
  All three verified in-repo before ruling: typecheck clean, Manual.test.tsx 8/8, no stderr.
  Reverted afterwards so the implementer owns the edits. Plan patched.
  Cost if wrong: none — all three are test-local and none weakens an assertion.

Task 17: Ruling on the Important: add unmount cleanup. The reviewer's argument is the right one —
  the brief's *own* justification for siting these effects in `Manual` rather than `renderManual`
  is that a consumer may embed `<Manual>` in a larger app, and that is precisely the case where
  leaving `document.title`, `<html lang>` and `data-color-scheme` permanently rewritten is a
  defect. Implemented as a separate mount-only effect that captures the pre-mount values and
  restores them, placed *before* the two setter effects so it sees the document untouched.
  Captured once rather than per navigation on purpose: a cleanup keyed on `route` would restore
  the previous *chapter's* title, so a host would inherit whichever chapter the reader left on.
  Added a test asserting a host's title and lang come back and the attribute is removed.
  Also narrowed the title effect's deps from `config` to `config.documentTitle` (the Minor).
  Verified in-repo before ruling: Manual.test.tsx 9/9, typecheck clean, correct under
  StrictMode's double-invoke. Reverted afterwards so the implementer owns the edits.
  Cost if wrong: none — restoring is strictly safer than leaking, and the new test pins it.
Task 18: Ruling A: my token test asserted `[data-color-scheme="dark"]` with double quotes while
  my tokens.css used single quotes. Fixed the **test**, not the CSS, and made it quote-agnostic
  (`/\[data-color-scheme=["']dark["']\]/`) rather than swapping one literal for the other: CSS
  accepts either, so pinning a quote style would make a behavioural assertion into a formatting
  one and would break again the next time someone reformats. Verified: 8/8, full suite 174/174.
Task 18: Ruling B: accept the `// @vitest-environment node` pragma the implementer added. It is
  not in the brief, but the test reads files off disk and under jsdom
  `new URL(relative, import.meta.url)` does not resolve to a filesystem path — node is the right
  environment for a file-reading test regardless. Added to the plan.
  Cost if wrong: none in either case; both are test-local.

Task 18: Ruling on the Critical (mine): `.manual` both established the container and queried it
  for its own `display`. An element is never the subject of its own container query — the query
  resolves against ancestors — so both `@container` blocks were dead code and the shell stayed a
  three-column row at every width, with descendants applying `grid-area` against a still-row flex
  parent. Fix is structural: `.manual` keeps the container and the theme, a new `.manual-layout`
  child carries the layout and both breakpoints. Confirmed by reading the landed CSS: the two
  `@container` blocks are nested inside `.manual`'s own rule.
  Cost if wrong: one extra DOM node. Against: the headline "modern CSS" feature of the project
  silently not working, invisible to a green suite.
Task 18: Ruling on finding 2: repeat the attribute selector when resetting a rule set through
  one. `.rail-link[data-level='3']` (0,2,0) beats a bare `.rail-link` reset (0,1,0); the reference
  listed both for exactly this reason. Generalised into the plan's rewrite rules.
Task 18: Ruling on finding 3: `clamp()` does not replace a breakpoint unless the arithmetic says
  so. At a 900px container `--manual-step-3` is still pinned to its 30px ceiling; its 1.5rem floor
  needs a ~343px container. The chapter title needs an explicit rule at the 900px breakpoint.
Task 19: Ruling on the Important: (b) ships with no inline comment while (a) three lines above
  explains itself, and the rationale lives only in a report that does not ship with the code.
  This repo's own convention (vitest.setup.ts) is to document cross-realm quirks inline. Comment
  requested. Not a rework.
Task 20: Ruling on the Important: the anchor-id parity check is wired but unexercised — confirmed
  by running validate on the broken fixture and getting zero occurrences of its message. Parity is
  structural precisely so a half-translated release cannot silently drop a step from a payment
  flow, and an unguarded check is one refactor from becoming a no-op. A thirteenth fixture case
  (same block count, same types, differing anchor id) plus an it.each row. Folded in the Minor
  about the `/schema|схем/i` row passing only because the fixture filename contains "schema".
Task 22: Ruling A (parity severity) — **later judged wrong by the final review and corrected;
  see the note at the end of this file**: `validateContent` returns `{ errors, warnings }`. The spec
  (design doc line 358) says parity is "reported rather than failed when a gap is intentional";
  the implementation made it an unconditional error, so the example's deliberate — and required —
  Kazakh gap made `example:validate` exit 1. A missing chapter in a non-base locale is a *designed*
  state: it is the entire reason `loadChapter` falls back and `ChapterView` renders
  `fallbackNotice`. It becomes a warning. A chapter present in both locales but structurally
  divergent stays an error, because that is the half-translated release parity actually guards
  against. Only `errors` sets the exit code.
  Cost if wrong: a genuinely forgotten translation is reported rather than fatal. Mitigated by it
  being printed every run, and by the structural checks staying fatal.
Task 22: Ruling B (API gap): `validateContent` and `buildSchema` ship as a separate
  `@evrika/manual-kit/validate` entry point, not from the main barrel. The plan twice promises a
  consumer with custom blocks can import `validateContent` (the CLI cannot take a registry on the
  command line), and `cli/index.ts`'s own comment says so — but nothing exported it, so the
  example had to reach in by relative path. A separate entry rather than the main barrel because
  it imports `ajv`, and a build-time validator must not land in every consumer's browser bundle.
  Cost if wrong: one more entry point to maintain. Against: the documented path does not exist.
Task 23: Ruling A: delete `--manual-breakpoint-narrow` / `--manual-breakpoint-wide`. Verified they
  are declared but never read — the container queries hardcode 900px/1200px — and the reason they
  *cannot* be read is that CSS does not permit a custom property inside a container-query
  condition. So they are undeliverable, not merely unused: a consumer could override one, see
  nothing change, and have no way to tell whether they had made a mistake. A token that silently
  does nothing is worse than no token. Removed from tokens.css and the test contract, with the
  reason recorded in both the test and docs/tokens.md.
  Cost if wrong: a consumer wanting different breakpoints must override the rules rather than a
  token — which is the true situation either way.
Task 23: Ruling B: the scaffold's theme.css is genuinely missing `body { margin: 0 }`, and the
  fault is mine. The requirement came out of Task 18's review and I wrote it into Task 22's
  example section rather than Task 21's scaffold section, so the scaffold was never told. Plan
  corrected in the right place and the scaffold test gains an assertion.
Task 23: Ruling C: Step 7's grep used `\s`, which BSD sed ignores, so its comment-stripping was a
  silent no-op on macOS and it reported JSDoc as violations. Confirmed on this machine. Switched
  to `[[:space:]]`. The check was passing for the wrong reason in reverse — it was *failing* for
  the wrong reason, which would have taught someone to ignore it.

---

## The ruling that was reversed

**Task 22 Ruling A** was right in its conclusion and wrong in its lever. The example manual's
deliberate Kazakh gap must not fail the build — but the fix downgraded *every* non-base-locale
gap to a warning unconditionally, where the spec asks for a gap to be "reported rather than
failed **when a gap is intentional**". That distinction was never implemented.

It mattered because both real manuals fail their build today on a missing chapter file. After
migrating to this package, that gate would silently have become advisory, and a translator who
forgot a Kazakh chapter would have shipped. The stated mitigation — that the warning is printed
every run — does not hold in CI, where nobody reads a passing job's output.

Corrected with `allowedGaps: { locale, chapterId }[]` on `validateContent` and a `--strict` flag
on `manual-kit validate`. Naming the intentional exception is what the spec actually asked for;
switching the mechanism off wholesale was not.
