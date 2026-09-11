# In-App Set Builder + Export — Design Spec

**Date:** 2026-09-11
**Status:** Approved for implementation planning

## 1. Purpose

Let a user author a question set entirely inside the app — no hand-written JSON — and
export it as a `.json` file to share with someone else. Official, app-authored exams
(bundled sets: sample sets, CompTIA Core 1 today, Core 2/Security+ later) must never be
exportable or deletable, only sets the user created or imported.

## 2. Scope

### In scope (v1)

- A structured, form-based builder covering the full schema: all five question types
  (`single`, `multi`, `boolean`, `ordering`, `matching`), topics, and exam config
  (question count, time limit, shuffle toggles).
- Create a new set from scratch, and edit an existing user-owned set, through the same
  UI.
- Export a user-owned set to a `.json` file: OS share sheet on iOS/Android, browser
  download on web.
- Reuse of the existing `source: 'bundled' | 'imported'` field as the "is this ours"
  tag — no schema change. Builder-created sets save with `source: 'imported'`.

### Out of scope (v1, deferred deliberately)

- Draft/autosave persistence of in-progress builder edits (closing the builder loses
  unsaved changes, same risk as `SetDetailView`'s existing unsaved config inputs).
- Forking/duplicating a bundled set as an editable starting point.
- Image upload or a media picker — `media.source` stays a plain `https://` URL text
  field, matching the existing schema constraint.
- Any monetization/paywall tier. `source` continues to mean only "ours vs. not ours,"
  not "free vs. paid."

## 3. Tagging — no data model change

The repository already carries `SetSummary.source: 'bundled' | 'imported'`, and
`storage.ts`'s `deleteSet` already throws server-side (not just UI-hidden) when
`source === 'bundled'`. This spec extends that same pattern to export:

- Builder-created and file-imported sets both save with `source: 'imported'` — fully
  deletable, editable, and exportable.
- Bundled sets stay locked out of all three, enforced at the function level (export
  throws if asked to export a bundled set), not only by hiding the button. This means a
  future caller that forgets the UI gate still can't export official content.

## 4. Navigation

Two new routes, following the existing `[setId]` / `[attemptId]` dynamic-segment
convention (`app/set/[setId].tsx`, `app/session/[attemptId].tsx`):

- `app/builder/new.tsx` — create flow, empty form.
- `app/builder/[setId].tsx` — edit flow; loads an existing set via `repository.getSet`,
  only reachable when that set's `source === 'imported'`.

Entry points:

- Library screen (`app/(tabs)/index.tsx` / `src/ui/LibraryView.tsx`): a new "Create a
  set" button next to the existing "Import a set" button.
- Set detail (`app/set/[setId].tsx` / `src/ui/SetDetailView.tsx`): an "Edit" button and
  an "Export" button, both gated by the same `deletable` boolean already computed there
  (`source === 'imported'`), placed next to the existing "Delete this set" button.

## 5. Builder UI

One shared component, `src/ui/SetBuilderView.tsx`, parameterized by initial data
(`null` for create, a loaded `QuestionSet` for edit) and a save handler. A single
scrollable form:

- **Set-level fields:** title, description, topics (add/remove/rename as a simple list
  of rows — no native picker component exists in this app's UI kit, so all selection
  UI here follows the same tap-to-select `Pressable` pattern `MatchingInput.tsx` already
  uses at runtime, not a native `<select>`).
- **Exam config:** question count, time limit, shuffle-questions/shuffle-options —
  reusing the exact input styling `SetDetailView.tsx` already defines inline.
- **Questions:** a list of collapsed cards (prompt + type badge) with Edit / Delete /
  Move-up / Move-down actions. "Add question" first shows a tappable list of the five
  types, then opens that type's editor.

Per-type editor components (each small and independently testable, avoiding one
oversized file):

| Component | Fields |
|---|---|
| `ChoiceQuestionEditor` | prompt, option rows (text + correct toggle, add/remove row), topic picker, optional explanation/difficulty. Used for both `single` and `multi` — the type is chosen up front. |
| `BooleanQuestionEditor` | prompt, True/False answer toggle, optional custom `labels.true`/`labels.false`. |
| `OrderingQuestionEditor` | prompt, item rows. **The order items are listed in is the correct order** — no separate "now define the correct order" step, mirroring the mental model of the runtime `OrderingInput`. `correctOrder` is derived as `items.map(i => i.id)` at save time. |
| `MatchingQuestionEditor` | prompt, left item rows, right item rows, then pairs built by tapping one left + one right and pressing "Add pair" (visually similar interaction to the runtime `MatchingInput`, but authoring both sides and the pairing instead of answering it). |

**IDs are never user-facing.** The user only ever types text (title, prompt, option
text, item text). IDs are generated at add-time:

- Set id: slugified title + a short random suffix (e.g. 6 base36 chars) — collision
  chance low enough that create doesn't need the import flow's
  replace/copy-conflict dialog.
- Question ids: a per-set counter (`q1`, `q2`, …).
- Option/item ids: a per-question counter (`o1`, `o2`, … ; matching uses `l1`, `l2`, …
  for left and `r1`, `r2`, … for right, since the schema requires left/right ids to be
  independently unique, not globally unique).
- Topic ids: slugified from the topic name.

## 6. Save / validation flow

On "Save," the form state is assembled into a plain object shaped like `QuestionSet`
and run through the existing `validateSet` (`src/core/validate.ts`) — the same function
`ImportView` already uses. On failure, the same `{location, message}` error-list UI
`ImportView` already renders is reused (no new validation UI). On success:

- Create: `repository.saveSet(set, 'imported')`.
- Edit: `repository.saveSet(set, 'imported', 'replace')` — same id, so attempt history
  tied to that `setId` survives, exactly like the bundled-set reseed path already
  guarantees (`bundled.test.ts`'s "is idempotent and keeps attempt history on re-seed").

## 7. Export

New module `src/data/exportSet.ts`, following the existing platform-branch pattern
`app/import.tsx`'s `readFile` helper already establishes:

```
exportSet(set: QuestionSet, source: SetSource): Promise<void>
```

- Throws if `source === 'bundled'` (defense in depth — see §3).
- Serializes with `JSON.stringify(set, null, 2)`; filename `${set.id}.json`.
- **Web:** Blob + object URL + a programmatic `<a download>` click, then revoke the
  URL.
- **Native:** write the JSON to the cache directory using the `File` class (the same
  SDK-57-correct class `import.tsx` already uses, since the legacy
  `readAsStringAsync`/`writeAsStringAsync` shims throw at runtime on this SDK), then
  call `Sharing.shareAsync(uri, { mimeType: 'application/json', dialogTitle: set.title })`.
- **New dependency:** `expo-sharing`. Already installed and verified against this
  project's SDK 57 pin during design (`expo-sharing@~57.0.19` resolved cleanly;
  `npm run typecheck` and the full test suite stayed green after the install).

## 8. Testing

Matches the existing project convention:

- `src/ui/SetBuilderView.test.tsx` and one test file per per-type editor component,
  controlled-props style (same pattern as `QuestionCard.test.tsx`).
- `src/data/exportSet.test.ts` covering the bundled-source guard and the serialized
  JSON shape (that the exported object round-trips through `validateSet` unchanged).
- No tests under `app/**` — this repo has zero route-level test coverage by established
  convention (see prior manual-verification finding on the Library screen crash). Given
  that exact prior incident, the full create → save → edit → export flow will be
  manually driven end-to-end in a real running instance of the app (browser, headless
  Chromium) before this work is considered done — a green test suite alone is not
  sufficient evidence here.

## 9. Files touched/added (summary)

- New: `app/builder/new.tsx`, `app/builder/[setId].tsx`
- New: `src/ui/SetBuilderView.tsx`, `src/ui/ChoiceQuestionEditor.tsx`,
  `src/ui/BooleanQuestionEditor.tsx`, `src/ui/OrderingQuestionEditor.tsx`,
  `src/ui/MatchingQuestionEditor.tsx`
- New: `src/data/exportSet.ts`
- Modified: `src/ui/LibraryView.tsx` (+ `app/(tabs)/index.tsx`) — "Create a set" entry
  point
- Modified: `src/ui/SetDetailView.tsx` (+ `app/set/[setId].tsx`) — "Edit" and "Export"
  buttons, gated on the existing `deletable`/`source === 'imported'` check
- Modified: `package.json` — `expo-sharing` dependency (already added)
- No changes to `src/core/schema.ts`, `src/data/repository.ts`, or `src/data/storage.ts`
