# Library Decluttering + Universal Delete — Design Spec

**Date:** 2026-10-01
**Status:** Approved for implementation planning

## 1. Purpose

With 10 bundled sets already shipped (2 samples, 5 full CompTIA exams, 3 quick
practice sets) plus whatever the user imports or builds, the library screen is one
flat, undifferentiated list — every set at the same visual weight, each row several
lines tall. This gets worse with every future exam. Two problems to solve together:

1. **Visual clutter** on the library screen itself.
2. **No way to remove a set you don't want to see**, for bundled (free) sets — only
   imported/created sets can currently be deleted (`storage.ts`'s `deleteSet` throws
   for `source === 'bundled'`, a deliberate protection added in the set-builder work).

## 2. Scope

### In scope (v1)

- Group the library screen into collapsible sections by exam family (A+ Core 1, A+
  Core 2, Security+, Network+, Samples, My sets), each sorted by a fixed display
  order defined in code.
- A search box that filters by title across all sets, flattening results across
  families while active.
- Trim each row to title + question count + best score (drop the description line)
  to cut per-row height.
- Let the user **hide** any bundled set from their library (reversible) and
  **delete** any imported/created set (permanent, unchanged from today).
- A new "Hidden exams" screen (linked from Settings) listing hidden bundled sets
  with a Restore action each.

### Out of scope (deferred, confirm before adding)

- Persisting collapsed/expanded section state across app restarts — sections always
  start expanded; collapse state lives in component state only for v1.
- Reordering families or sets by hand (drag-to-reorder), favoriting/pinning.
- Any change to the imported-set delete semantics, or to `deleteSet`'s refusal to
  touch bundled sets — that guard stays exactly as-is.
- Any change to the portable `.json` set schema (`core/schema.ts`) — family is
  presentation metadata, not exam content, and must never show up in an exported
  file or be required on import.

## 3. Data model

### 3.1 Family grouping (new, code-only, no schema change)

A new export in `src/data/bundled.ts`:

```ts
export type BundledFamily = { id: string; label: string; setIds: string[] };

export const BUNDLED_FAMILIES: BundledFamily[] = [
  { id: 'a-plus-core-1', label: 'A+ Core 1', setIds: ['comptia-a-plus-core-1-220-1201'] },
  {
    id: 'a-plus-core-2',
    label: 'A+ Core 2',
    setIds: [
      'comptia-a-plus-core-2-220-1202',
      'comptia-a-plus-core-2-220-1202-vol2',
      'quick-comptia-a-plus-core-2-220-1202',
    ],
  },
  {
    id: 'security-plus',
    label: 'Security+',
    setIds: [
      'comptia-security-plus-sy0-701',
      'comptia-security-plus-sy0-701-vol2',
      'quick-comptia-security-plus-sy0-701',
    ],
  },
  { id: 'network-plus', label: 'Network+', setIds: ['quick-comptia-network-plus-n10-009'] },
  { id: 'samples', label: 'Samples', setIds: ['sample-cloud-basics', 'sample-all-types'] },
];
```

Display order: the array order above (certification families first, Samples last,
"My sets" — every `source === 'imported'` set — always after that, unconditionally).
A bundled set id not present in any family's `setIds` falls back into a family
labeled with its own title (so a future bundled set added without a matching
`BUNDLED_FAMILIES` entry still renders — degrades gracefully instead of vanishing).
This list is the single place to touch when bundling a new exam, alongside the
existing `BUNDLED_SETS` registration (per the standing memory note that `bundled.ts`
is where new content gets wired in).

A helper `familyForSet(summary: SetSummary): string` resolves the label (imported →
`'My sets'`, bundled → lookup above). This lives in `bundled.ts` and is consumed by
`LibraryView`, not by the storage layer — grouping is a presentation concern.

### 3.2 Hidden bundled sets (new persisted state)

One new storage key, `pt:hiddenBundled`, holding a `string[]` of hidden bundled set
ids (mirrors the existing `IndexEntry[]`-at-one-key pattern already used for
`pt:index`).

`Repository` interface gains three methods:

```ts
hideBundledSet(setId: string): Promise<void>;
restoreBundledSet(setId: string): Promise<void>;
listHiddenSets(): Promise<SetSummary[]>;
```

- `hideBundledSet`: throws if `setId` isn't in the index or isn't `source ===
  'bundled'` (mirrors the existing guard style in `deleteSet`/`saveSet`). Adds the id
  to the hidden list. Does **not** touch the set's stored content or its attempts —
  per the approved answer, hiding is purely a visibility flag; attempt history
  survives untouched and reappears automatically on restore.
- `restoreBundledSet`: removes the id from the hidden list. No-op if not present.
- `listHiddenSets`: returns `SetSummary[]` for exactly the ids in the hidden list,
  built the same way `listSets()` builds summaries (attempt count / best score /
  last attempt still computed — a restored set's card looks exactly like it did
  before hiding).

`listSets()` changes to exclude any id present in the hidden list. Every existing
call site (library screen, set-detail "does this still exist" check, etc.) keeps its
current signature and gets the filtered view automatically — no caller changes
needed beyond the library screen itself.

`deleteSet` is **unchanged**: still throws for `source === 'bundled'`. Hiding and
deleting remain two distinct operations with two distinct guarantees; this spec does
not touch the bundled-delete guard that closed the earlier Critical bypass.

`seedBundledSets` is **unchanged**: it keeps writing/replacing all bundled content on
every app start regardless of hidden state, so a hidden set's content still updates
silently in the background — only `listSets()` keeps it out of view, so a restore
shows current content, not stale content from before it was hidden.

## 4. UI

### 4.1 Library screen (`LibraryView` + `app/(tabs)/index.tsx`)

- Fetch `sets` as today, then group client-side via `familyForSet`, in the fixed
  family order from §3.1 (My sets last).
- Each family renders as a header row (label + count, e.g. "Security+ (3)") that
  toggles a `useState` expanded/collapsed flag — default expanded. A family with
  zero sets (e.g., all its sets hidden) is omitted entirely, not shown collapsed-empty.
- A `TextInput` search box above the sections, matching sets by case-insensitive
  substring on `title`. While non-empty, render one flat filtered list (reusing the
  existing row component) instead of the grouped sections — no empty sections to
  wade through, no "which section was I in" confusion.
- Row content trims to: title, `"{questionCount} questions"`, and the best-score
  line only when `attemptCount > 0` (unchanged condition, just dropping the
  description `Text` block that today always renders when present).

### 4.2 Set detail (`SetDetailView` + `app/set/[setId].tsx`)

- `SetDetailView` takes two independent optional props instead of one combined
  delete affordance: `onDelete` (unchanged — rendered only for imported sets, same
  "Delete this set" button, same permanent behavior) and a new `onHide` (rendered
  only for bundled sets, also labeled "Delete this set" for interface consistency —
  the user shouldn't need to learn two different button labels for "make this go
  away").
- `app/set/[setId].tsx` wires `onHide` for `source === 'bundled'` to a confirm
  dialog distinct from the imported-delete one:
  > "Remove this free exam? It'll disappear from your library, but your attempt
  > history is kept and you can bring it back anytime from Settings → Hidden exams."
  On confirm: `repository.hideBundledSet(set.id)` then `router.back()`.
- The existing `deletable` boolean (gating edit/export/delete to imported-only)
  stays exactly as-is for edit/export. Only the delete/hide slot becomes
  source-aware.

### 4.3 Settings (`SettingsView` + new route)

- `SettingsView` gains a row: `"Hidden exams"` (with a count badge once there's at
  least one), navigating to a new route `app/hidden-sets.tsx`.
- New screen (plain `Screen` + `Card`/`ListRow`, matching existing list patterns):
  lists `repository.listHiddenSets()` results, each row showing title + question
  count + a "Restore" `Button`. Empty state: `"No hidden exams."` Restoring calls
  `repository.restoreBundledSet(id)` and removes the row from local state (no need
  to refetch the whole list).

## 5. Error handling

- `hideBundledSet`/`restoreBundledSet` on a nonexistent or wrong-source id throw,
  consistent with `deleteSet`'s existing behavior — these are programmer-error
  guards (the UI never offers hide on a non-bundled set, or restore on a
  non-hidden one), not user-facing validation, so no new confirm/toast copy is
  needed for the throw path itself.
- Hidden-exams screen handles a `listHiddenSets()` rejection the same way
  `LibraryView` already handles a `listSets()` rejection today (there isn't
  explicit handling today beyond the loading state resolving — this spec doesn't
  add new error UI beyond what the existing screens already do, to stay
  consistent).

## 6. Testing

- `storage.test.ts`: `hideBundledSet` / `restoreBundledSet` / `listHiddenSets`
  happy paths, the bundled-only guard (throws on an imported id or unknown id),
  `listSets()` excluding hidden ids, attempts/content surviving a hide+restore
  round trip untouched.
- `bundled.test.ts`: `familyForSet` resolves every real bundled id to the expected
  family label, and falls back to the set's own title for an unmapped id.
- `LibraryView.test.tsx`: sections render in family order with correct counts,
  collapse/expand toggles visibility, search flattens and filters across families,
  an empty family (all hidden) doesn't render.
- `SetDetailView.test.tsx`: `onHide` renders and fires only when passed (bundled
  case); `onDelete` behavior unchanged (imported case); never both at once.
- New `app/hidden-sets.tsx` route test (via `expo-router/testing-library`, per this
  project's existing route-coverage pattern): lists hidden sets, Restore removes a
  row and calls the repository method, empty state renders with zero hidden sets.
- `app/set/[setId].tsx` route test: confirms the bundled-hide confirm copy and
  `hideBundledSet` call; existing imported-delete test path unchanged.
- Manual browser verification (puppeteer-core + google-chrome-stable) of: section
  collapse/expand, search filtering, hiding a bundled set then restoring it from
  Settings, and deleting an imported set — per this project's standing rule that
  web-rendering changes get a real-browser check, not just RNTL.

## 7. Migration

No migration needed for existing installs: `pt:hiddenBundled` simply doesn't exist
yet, and `read()`'s fallback-on-missing-key pattern (already used for every other
key in `storage.ts`) returns `[]` for it, so `listSets()` behaves exactly as today
until a user hides something for the first time.
