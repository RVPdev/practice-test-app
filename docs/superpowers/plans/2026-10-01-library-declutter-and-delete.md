# Library Decluttering + Universal Delete Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the library screen stay readable as exam count grows (grouped, collapsible, searchable sections with trimmed rows), and let the user remove any set from their library — permanently for imported/created sets (unchanged), reversibly for free bundled exams (new).

**Architecture:** Family grouping is a pure, code-only mapping in `src/data/bundled.ts` (no schema change) consumed by `LibraryView`. "Hiding" a bundled set is a new boolean-membership list (`pt:hiddenBundled`) in the existing `storage.ts` repository, filtered out of `listSets()` and surfaced only via a new `listHiddenSets()` for a dedicated restore screen — the existing `deleteSet` guard against bundled sets is untouched.

**Tech Stack:** Expo Router (file-based routes), React Native (web + native via react-native-web), TypeScript, Jest + `@testing-library/react-native` + `expo-router/testing-library`.

**Spec:** `docs/superpowers/specs/2026-10-01-library-declutter-and-delete-design.md`

## Global Constraints

- Follow the versioned Expo docs at https://docs.expo.dev/versions/v57.0.0/ for any Expo API used (per this repo's `AGENTS.md`).
- Never modify `core/schema.ts` or the portable `.json` set format — family grouping is presentation-only metadata, per spec §2/§3.1.
- `deleteSet`'s refusal to touch a `source: 'bundled'` entry must remain exactly as-is — hiding and deleting stay two distinct operations, per spec §3.2.
- Hiding a bundled set must never alter or remove its stored content or its attempts — only a visibility flag changes, per spec §3.2.
- No persisted collapse state across app restarts in v1 — section expand/collapse is local component state only, per spec §2.
- Git commit messages must **not** include a "Co-Authored-By" or any other Claude/AI attribution trailer — this repo's standing rule, keep every commit message to a plain subject (+ optional body).
- Run `npm test` after every task and keep the full suite green before committing that task.

## Review Focus

- Hiding the same bundled set twice must stay idempotent — no duplicate entries in `listHiddenSets()`.
- Restoring a set that was never hidden (or already restored) must be a harmless no-op, not a throw.
- A `BUNDLED_FAMILIES` catalog entry referencing a set id absent from the current `sets` list must not crash grouping — that id is simply skipped.
- A whitespace-only search query must behave like an empty query (grouped sections shown, not an empty "no matches" state).
- Hiding and restoring a bundled set that has zero attempts must work cleanly — nothing may assume attempts exist.

---

### Task 1: Repository — hide/restore bundled sets

**Files:**
- Modify: `src/data/repository.ts` (interface)
- Modify: `src/data/storage.ts` (implementation)
- Test: `src/data/storage.test.ts`

**Interfaces:**
- Consumes: nothing new — builds on the existing `IndexEntry[]` at `pt:index` and the existing `read`/`write` helpers in `storage.ts`.
- Produces: `Repository.hideBundledSet(setId: string): Promise<void>`, `Repository.restoreBundledSet(setId: string): Promise<void>`, `Repository.listHiddenSets(): Promise<SetSummary[]>` — consumed by Tasks 5, 7, 9.

- [ ] **Step 1: Write the failing tests**

Add to `src/data/storage.test.ts`, inside the existing `describe('createStorageRepository', ...)` block, right after the `'allows re-seeding a bundled set with a fresh bundled save'` test (which ends around line 169):

```ts
  describe('hiding and restoring bundled sets', () => {
    it('hides a bundled set so it no longer appears in listSets', async () => {
      await repo.saveSet(makeSet(), 'bundled');
      await repo.hideBundledSet('set-1');
      expect(await repo.listSets()).toEqual([]);
    });

    it("keeps a hidden set's content and attempts, returning it via listHiddenSets", async () => {
      await repo.saveSet(makeSet(), 'bundled');
      await repo.saveAttempt(makeAttempt());
      await repo.hideBundledSet('set-1');

      const hidden = await repo.listHiddenSets();
      expect(hidden).toHaveLength(1);
      expect(hidden[0].id).toBe('set-1');
      expect(hidden[0].attemptCount).toBe(1);
      expect(await repo.getSet('set-1')).not.toBeNull();
    });

    it("restores a hidden set so it reappears in listSets with its history intact", async () => {
      await repo.saveSet(makeSet(), 'bundled');
      await repo.saveAttempt(makeAttempt());
      await repo.hideBundledSet('set-1');

      await repo.restoreBundledSet('set-1');

      const sets = await repo.listSets();
      expect(sets).toHaveLength(1);
      expect(sets[0].id).toBe('set-1');
      expect(sets[0].attemptCount).toBe(1);
      expect(await repo.listHiddenSets()).toEqual([]);
    });

    it('refuses to hide an imported set', async () => {
      await repo.saveSet(makeSet(), 'imported');
      await expect(repo.hideBundledSet('set-1')).rejects.toThrow('bundled');
    });

    it('refuses to hide a set id that does not exist', async () => {
      await expect(repo.hideBundledSet('no-such-set')).rejects.toThrow();
    });

    it('is idempotent - hiding an already-hidden set does not duplicate it', async () => {
      await repo.saveSet(makeSet(), 'bundled');
      await repo.hideBundledSet('set-1');
      await repo.hideBundledSet('set-1');
      expect(await repo.listHiddenSets()).toHaveLength(1);
    });

    it('restoring a set that was never hidden is a harmless no-op', async () => {
      await repo.saveSet(makeSet(), 'bundled');
      await expect(repo.restoreBundledSet('set-1')).resolves.toBeUndefined();
      expect(await repo.listSets()).toHaveLength(1);
    });

    it('hides and restores a set with zero attempts without error', async () => {
      await repo.saveSet(makeSet(), 'bundled');
      await repo.hideBundledSet('set-1');
      const hidden = await repo.listHiddenSets();
      expect(hidden[0].attemptCount).toBe(0);
      expect(hidden[0].bestPercent).toBeNull();
      await repo.restoreBundledSet('set-1');
      expect(await repo.listSets()).toHaveLength(1);
    });
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest src/data/storage.test.ts`
Expected: FAIL — `repo.hideBundledSet is not a function` (and similarly for `restoreBundledSet`/`listHiddenSets`).

- [ ] **Step 3: Add the methods to the `Repository` interface**

In `src/data/repository.ts`, add three lines to the interface (after `deleteSet`, before `listAttempts`):

```ts
export interface Repository {
  listSets(): Promise<SetSummary[]>;
  getSet(setId: string): Promise<QuestionSet | null>;
  /** Returns the id the set was stored under - a copy gets a new one. */
  saveSet(set: QuestionSet, source: SetSource, mode?: SaveMode): Promise<string>;
  deleteSet(setId: string): Promise<void>;
  hideBundledSet(setId: string): Promise<void>;
  restoreBundledSet(setId: string): Promise<void>;
  listHiddenSets(): Promise<SetSummary[]>;
  listAttempts(setId?: string): Promise<Attempt[]>;
  getAttempt(attemptId: string): Promise<Attempt | null>;
  saveAttempt(attempt: Attempt): Promise<void>;
  getInProgress(): Promise<SessionState | null>;
  saveInProgress(state: SessionState | null): Promise<void>;
  getTermsAccepted(): Promise<boolean>;
  acceptTerms(): Promise<void>;
}
```

- [ ] **Step 4: Implement in `storage.ts`**

In `src/data/storage.ts`:

1. Add the new key constant next to the others (after `const TERMS_ACCEPTED_KEY = ...`):

```ts
const HIDDEN_BUNDLED_KEY = `${KEY_PREFIX}hiddenBundled`;
```

2. Add a `readHiddenIds` helper next to `readIndex`/`readAttempts`:

```ts
  const readIndex = () => read<IndexEntry[]>(INDEX_KEY, []);
  const readAttempts = (setId: string) => read<Attempt[]>(attemptsKey(setId), []);
  const readHiddenIds = () => read<string[]>(HIDDEN_BUNDLED_KEY, []);
```

3. Replace the duplicated summary-building logic in `listSets()` with a shared `summarize` helper, and use it from both `listSets()` and the new `listHiddenSets()`. Replace the existing `toEntry`/`listSets` region with:

```ts
  const toEntry = (set: QuestionSet, source: SetSource): IndexEntry => ({
    id: set.id,
    title: set.title,
    description: set.description ?? null,
    version: set.version ?? null,
    questionCount: set.questions.length,
    topicCount: set.topics?.length ?? 0,
    source,
  });

  async function summarize(entry: IndexEntry): Promise<SetSummary> {
    const attempts = await readAttempts(entry.id);
    const best = attempts.reduce<number | null>(
      (max, a) => (max === null || a.score.percent > max ? a.score.percent : max),
      null,
    );
    const last = attempts.reduce<string | null>(
      (latest, a) => (latest === null || a.finishedAt > latest ? a.finishedAt : latest),
      null,
    );
    return { ...entry, attemptCount: attempts.length, bestPercent: best, lastAttemptAt: last };
  }
```

   (This replaces the inline `for` loop that used to live directly inside `listSets()` — the loop body becomes `summarize`.)

4. Update `listSets()` and add `listHiddenSets()` in the returned object:

```ts
    async listSets() {
      const index = await readIndex();
      const hidden = new Set(await readHiddenIds());
      const visible = index.filter((entry) => !hidden.has(entry.id));
      return Promise.all(visible.map(summarize));
    },

    async listHiddenSets() {
      const index = await readIndex();
      const hidden = new Set(await readHiddenIds());
      const hiddenEntries = index.filter((entry) => hidden.has(entry.id));
      return Promise.all(hiddenEntries.map(summarize));
    },
```

5. Add `hideBundledSet`/`restoreBundledSet` next to `deleteSet`:

```ts
    async hideBundledSet(setId) {
      const index = await readIndex();
      const entry = index.find((e) => e.id === setId);
      if (!entry || entry.source !== 'bundled') {
        throw new Error(`"${setId}" is not a bundled set and cannot be hidden`);
      }
      const hidden = new Set(await readHiddenIds());
      hidden.add(setId);
      await write(HIDDEN_BUNDLED_KEY, [...hidden]);
    },

    async restoreBundledSet(setId) {
      const hidden = new Set(await readHiddenIds());
      hidden.delete(setId);
      await write(HIDDEN_BUNDLED_KEY, [...hidden]);
    },
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx jest src/data/storage.test.ts`
Expected: PASS, all tests including the new `describe('hiding and restoring bundled sets', ...)` block.

- [ ] **Step 6: Run the full suite**

Run: `npm test && npm run typecheck`
Expected: PASS, no type errors (no other suite references `Repository` in a way the new methods would break — they're additive).

- [ ] **Step 7: Commit**

```bash
git add src/data/repository.ts src/data/storage.ts src/data/storage.test.ts
git commit -m "Add hide/restore for bundled sets to the repository"
```

---

### Task 2: Bundled family catalog + grouping helper

**Files:**
- Modify: `src/data/bundled.ts`
- Test: `src/data/bundled.test.ts`

**Interfaces:**
- Consumes: `SetSummary` from `src/data/repository.ts` (existing type, unchanged).
- Produces: `BundledFamily` type, `BUNDLED_FAMILIES: BundledFamily[]`, `familyForSet(summary): string`, `groupSetsByFamily(sets: SetSummary[]): { family: string; sets: SetSummary[] }[]` — consumed by Task 3 (`LibraryView`).

- [ ] **Step 1: Write the failing tests**

Add to `src/data/bundled.test.ts` (new imports + new `describe` blocks at the end of the file):

```ts
import { BUNDLED_FAMILIES, BUNDLED_SETS, familyForSet, groupSetsByFamily, seedBundledSets } from './bundled';
import type { SetSummary } from './repository';
```

(replace the existing `import { BUNDLED_SETS, seedBundledSets } from './bundled';` line with the one above)

```ts
describe('familyForSet', () => {
  it('resolves every id in BUNDLED_FAMILIES to its own family label', () => {
    for (const family of BUNDLED_FAMILIES) {
      for (const id of family.setIds) {
        expect(familyForSet({ id, title: 'irrelevant', source: 'bundled' })).toBe(family.label);
      }
    }
  });

  it("falls back to the set's own title for a bundled id with no family entry", () => {
    expect(familyForSet({ id: 'future-exam-xyz', title: 'Future Exam', source: 'bundled' })).toBe(
      'Future Exam',
    );
  });

  it('always resolves an imported set to "My sets", regardless of its id', () => {
    expect(
      familyForSet({ id: 'comptia-a-plus-core-1-220-1201', title: 'Copy', source: 'imported' }),
    ).toBe('My sets');
  });
});

describe('groupSetsByFamily', () => {
  const make = (over: Partial<SetSummary>): SetSummary => ({
    id: 'x',
    title: 'X',
    description: null,
    version: null,
    questionCount: 1,
    topicCount: 0,
    source: 'bundled',
    attemptCount: 0,
    bestPercent: null,
    lastAttemptAt: null,
    ...over,
  });

  it('orders a known family before "My sets", and its own sets by catalog order', () => {
    const groups = groupSetsByFamily([
      make({ id: 'quick-comptia-security-plus-sy0-701', title: 'Quick Sec+' }),
      make({ id: 'comptia-security-plus-sy0-701', title: 'Sec+' }),
      make({ id: 'imported-1', title: 'Mine', source: 'imported' }),
    ]);
    expect(groups.map((g) => g.family)).toEqual(['Security+', 'My sets']);
    expect(groups[0].sets.map((s) => s.id)).toEqual([
      'comptia-security-plus-sy0-701',
      'quick-comptia-security-plus-sy0-701',
    ]);
  });

  it('omits a family entirely when none of its sets are present', () => {
    const groups = groupSetsByFamily([make({ id: 'comptia-security-plus-sy0-701', title: 'Sec+' })]);
    expect(groups.map((g) => g.family)).not.toContain('A+ Core 2');
  });

  it('groups an unmapped bundled id under its own title instead of dropping it', () => {
    const groups = groupSetsByFamily([make({ id: 'future-exam-xyz', title: 'Future Exam' })]);
    expect(groups).toEqual([
      { family: 'Future Exam', sets: [expect.objectContaining({ id: 'future-exam-xyz' })] },
    ]);
  });

  it('does not crash when a catalog entry references an id absent from the input list', () => {
    // Security+'s vol2/quick ids aren't in the input - only the full exam is.
    const groups = groupSetsByFamily([make({ id: 'comptia-security-plus-sy0-701', title: 'Sec+' })]);
    expect(groups.find((g) => g.family === 'Security+')?.sets).toHaveLength(1);
  });

  it('returns no groups for an empty input', () => {
    expect(groupSetsByFamily([])).toEqual([]);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest src/data/bundled.test.ts`
Expected: FAIL — `BUNDLED_FAMILIES`/`familyForSet`/`groupSetsByFamily` are not exported yet.

- [ ] **Step 3: Implement in `bundled.ts`**

Change the top import line from:

```ts
import type { Repository } from './repository';
```

to:

```ts
import type { Repository, SetSummary } from './repository';
```

Then add, after the `BUNDLED_SETS` array and before `seedBundledSets`:

```ts
export type BundledFamily = { id: string; label: string; setIds: string[] };

/**
 * Display grouping for the library screen. Code-only, never part of the
 * portable `.json` set schema. This is the one place to extend when a new
 * bundled exam ships, alongside its `BUNDLED_SETS` registration above.
 */
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

/**
 * Imported/created sets always land in "My sets". A bundled id with no
 * matching family entry falls back to its own title, so new content never
 * silently vanishes from the library while BUNDLED_FAMILIES is caught up.
 */
export function familyForSet(summary: Pick<SetSummary, 'id' | 'title' | 'source'>): string {
  if (summary.source === 'imported') return 'My sets';
  const match = BUNDLED_FAMILIES.find((family) => family.setIds.includes(summary.id));
  return match ? match.label : summary.title;
}

/**
 * Groups sets for the library screen: known families first (in
 * BUNDLED_FAMILIES order, each family's own sets ordered by its `setIds`
 * list), then any bundled set without a family entry under its own title,
 * then "My sets" last. A family with none of its sets present is omitted.
 */
export function groupSetsByFamily(sets: SetSummary[]): { family: string; sets: SetSummary[] }[] {
  const orderedLabels = BUNDLED_FAMILIES.map((family) => family.label);
  const byFamily = new Map<string, SetSummary[]>();

  for (const set of sets) {
    const family = familyForSet(set);
    if (family !== 'My sets' && !orderedLabels.includes(family)) orderedLabels.push(family);
    const bucket = byFamily.get(family) ?? [];
    bucket.push(set);
    byFamily.set(family, bucket);
  }
  orderedLabels.push('My sets');

  return orderedLabels
    .filter((family) => byFamily.has(family))
    .map((family) => {
      const catalogEntry = BUNDLED_FAMILIES.find((f) => f.label === family);
      const members = byFamily.get(family)!;
      if (!catalogEntry) return { family, sets: members };
      const order = catalogEntry.setIds;
      return { family, sets: [...members].sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id)) };
    });
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest src/data/bundled.test.ts`
Expected: PASS, all tests including the new `familyForSet`/`groupSetsByFamily` blocks.

- [ ] **Step 5: Run the full suite**

Run: `npm test && npm run typecheck`
Expected: PASS, no test failures and no type errors.

- [ ] **Step 6: Commit**

```bash
git add src/data/bundled.ts src/data/bundled.test.ts
git commit -m "Add bundled-set family catalog and grouping helper"
```

---

### Task 3: Library screen — grouped sections, search, trimmed rows

**Files:**
- Modify: `src/ui/LibraryView.tsx`
- Modify: `src/ui/LibraryView.test.tsx`

**Interfaces:**
- Consumes: `groupSetsByFamily` from `@/data/bundled` (Task 2).
- Produces: no external API change — `LibraryView`'s props stay the same; internal rendering changes only. `app/(tabs)/index.tsx` needs no changes for this task.

- [ ] **Step 1: Update the failing/changed tests**

In `src/ui/LibraryView.test.tsx`, replace the first test (it currently asserts the old "N questions · M topics" format, which this task removes) and add new tests. Replace:

```ts
  it('lists each set with its question and topic counts', async () => {
    await render(
      <LibraryView
        sets={[summary()]}
        loading={false}
        onOpenSet={() => {}}
        onImport={() => {}}
        onCreate={() => {}}
      />,
    );
    expect(screen.getByText('Cloud Basics')).toBeTruthy();
    expect(screen.getByText('40 questions · 3 topics')).toBeTruthy();
  });
```

with:

```ts
  it('lists each set with its question count', async () => {
    await render(
      <LibraryView
        sets={[summary()]}
        loading={false}
        onOpenSet={() => {}}
        onImport={() => {}}
        onCreate={() => {}}
      />,
    );
    expect(screen.getByText('Cloud Basics')).toBeTruthy();
    expect(screen.getByText('40 questions')).toBeTruthy();
  });
```

Then add a new `describe` block at the end of the file (after the `'LibraryView resume banner'` block):

```ts
describe('LibraryView grouping and search', () => {
  const secPlusFull = summary({
    id: 'comptia-security-plus-sy0-701',
    title: 'Security+ Full',
  });
  const secPlusQuick = summary({
    id: 'quick-comptia-security-plus-sy0-701',
    title: 'Security+ Quick',
  });
  const myImported = summary({ id: 'imported-1', title: 'My Own Set', source: 'imported' });

  const base = {
    loading: false,
    onOpenSet: () => {},
    onImport: () => {},
    onCreate: () => {},
  };

  it('groups sets into family sections with a count, in catalog order', async () => {
    await render(<LibraryView {...base} sets={[secPlusQuick, secPlusFull, myImported]} />);
    expect(screen.getByText('▾ Security+ (2)')).toBeTruthy();
    expect(screen.getByText('▾ My sets (1)')).toBeTruthy();
  });

  it('does not render a family section when none of its sets are present', async () => {
    await render(<LibraryView {...base} sets={[secPlusFull]} />);
    expect(screen.queryByText(/A\+ Core 2/)).toBeNull();
  });

  it('collapsing a family hides its sets, and toggling again shows them', async () => {
    await render(<LibraryView {...base} sets={[secPlusFull]} />);
    expect(screen.getByTestId(`set-card-${secPlusFull.id}`)).toBeTruthy();

    fireEvent.press(screen.getByTestId('family-toggle-security'));
    expect(screen.queryByTestId(`set-card-${secPlusFull.id}`)).toBeNull();

    fireEvent.press(screen.getByTestId('family-toggle-security'));
    expect(screen.getByTestId(`set-card-${secPlusFull.id}`)).toBeTruthy();
  });

  it('search filters across families and hides the section headers while active', async () => {
    await render(<LibraryView {...base} sets={[secPlusFull, myImported]} />);

    fireEvent.changeText(screen.getByTestId('set-search'), 'Own');

    expect(screen.getByTestId(`set-card-${myImported.id}`)).toBeTruthy();
    expect(screen.queryByTestId(`set-card-${secPlusFull.id}`)).toBeNull();
    expect(screen.queryByText(/▾ Security\+/)).toBeNull();
  });

  it('shows a no-matches message for a search with no hits', async () => {
    await render(<LibraryView {...base} sets={[secPlusFull]} />);
    fireEvent.changeText(screen.getByTestId('set-search'), 'nothing matches this');
    expect(screen.getByText('No sets match "nothing matches this".')).toBeTruthy();
  });

  it('treats a whitespace-only search as empty and keeps showing grouped sections', async () => {
    await render(<LibraryView {...base} sets={[secPlusFull]} />);
    fireEvent.changeText(screen.getByTestId('set-search'), '   ');
    expect(screen.getByText('▾ Security+ (1)')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest src/ui/LibraryView.test.tsx`
Expected: FAIL — no family headers, no search box exist yet; the "40 questions" text doesn't match the current "40 questions · 3 topics" row.

- [ ] **Step 3: Rewrite `LibraryView.tsx`**

Replace the full file with:

```tsx
import { useState } from 'react';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';
import { slugify } from '@/core/id';
import type { RunMode } from '@/core/types';
import { groupSetsByFamily } from '@/data/bundled';
import type { SetSummary } from '@/data/repository';
import { Button } from './Button';
import { Card } from './Card';
import { ListRow } from './ListRow';
import { formatDate, formatPercent } from './format';
import { Screen } from './Screen';
import { radius, spacing, type, useTheme } from './theme';

function SetRow({ set, onPress, isLast }: { set: SetSummary; onPress: () => void; isLast: boolean }) {
  const theme = useTheme();
  return (
    <ListRow testID={`set-card-${set.id}`} onPress={onPress} isLast={isLast}>
      <Text style={[type.heading, { color: theme.text }]}>{set.title}</Text>
      <Text style={[type.caption, { color: theme.textMuted }]}>{`${set.questionCount} questions`}</Text>
      {set.attemptCount > 0 && set.bestPercent !== null ? (
        <Text style={[type.caption, { color: theme.textMuted }]}>
          {`Best ${formatPercent(set.bestPercent)} · last ${formatDate(set.lastAttemptAt ?? '')}`}
        </Text>
      ) : null}
    </ListRow>
  );
}

function FamilySection({
  family,
  sets,
  collapsed,
  onToggle,
  onOpenSet,
}: {
  family: string;
  sets: SetSummary[];
  collapsed: boolean;
  onToggle: () => void;
  onOpenSet: (setId: string) => void;
}) {
  const theme = useTheme();
  return (
    <View style={{ gap: spacing.xs }}>
      <Pressable accessibilityRole="button" testID={`family-toggle-${slugify(family)}`} onPress={onToggle}>
        <Text style={[type.label, { color: theme.text }]}>
          {`${collapsed ? '▸' : '▾'} ${family} (${sets.length})`}
        </Text>
      </Pressable>
      {collapsed ? null : (
        <Card>
          {sets.map((set, index) => (
            <SetRow key={set.id} set={set} onPress={() => onOpenSet(set.id)} isLast={index === sets.length - 1} />
          ))}
        </Card>
      )}
    </View>
  );
}

export function LibraryView({
  sets,
  loading,
  onOpenSet,
  onImport,
  onCreate,
  inProgress = null,
  onResume = () => {},
  onDiscard = () => {},
}: {
  sets: SetSummary[];
  loading: boolean;
  onOpenSet: (setId: string) => void;
  onImport: () => void;
  onCreate: () => void;
  inProgress?: { attemptId: string; setTitle: string; mode: RunMode } | null;
  onResume?: () => void;
  onDiscard?: () => void;
}) {
  const theme = useTheme();
  const [query, setQuery] = useState('');
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const trimmedQuery = query.trim().toLowerCase();
  const searching = trimmedQuery.length > 0;
  const searchResults = searching ? sets.filter((set) => set.title.toLowerCase().includes(trimmedQuery)) : [];

  const searchInputStyle = {
    ...type.body,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: radius.sm,
    color: theme.text,
    backgroundColor: theme.surface,
    padding: spacing.sm,
  };

  return (
    <Screen>
      <View style={{ gap: spacing.xs }}>
        <Text style={[type.title, { color: theme.text }]}>Question sets</Text>
        <Text style={[type.caption, { color: theme.textMuted }]}>
          Pick a set to practise, or import your own JSON.
        </Text>
      </View>

      {inProgress ? (
        <Card testID="resume-banner">
          <Text style={[type.heading, { color: theme.text }]}>Unfinished attempt</Text>
          <Text style={[type.caption, { color: theme.textMuted }]}>
            {`You have a ${inProgress.mode === 'mock' ? 'mock test' : 'practice run'} in progress on "${inProgress.setTitle}".`}
          </Text>
          <Button title="Resume" onPress={onResume} testID="resume-session" />
          <Button title="Discard it" variant="secondary" onPress={onDiscard} testID="discard-session" />
        </Card>
      ) : null}

      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        <Button title="Import a set" onPress={onImport} variant="secondary" testID="import-button" />
        <Button title="Create a set" onPress={onCreate} variant="secondary" testID="create-button" />
      </View>

      {sets.length > 0 ? (
        <TextInput
          testID="set-search"
          value={query}
          onChangeText={setQuery}
          placeholder="Search your sets"
          placeholderTextColor={theme.textMuted}
          style={searchInputStyle}
        />
      ) : null}

      {loading ? (
        <ActivityIndicator testID="library-loading" />
      ) : sets.length === 0 ? (
        <Card>
          <Text style={[type.body, { color: theme.text }]}>No question sets yet.</Text>
          <Text style={[type.caption, { color: theme.textMuted }]}>
            Import a JSON file or create your own to get started.
          </Text>
        </Card>
      ) : searching ? (
        searchResults.length === 0 ? (
          <Card>
            <Text style={[type.body, { color: theme.text }]}>{`No sets match "${query.trim()}".`}</Text>
          </Card>
        ) : (
          <Card>
            {searchResults.map((set, index) => (
              <SetRow
                key={set.id}
                set={set}
                onPress={() => onOpenSet(set.id)}
                isLast={index === searchResults.length - 1}
              />
            ))}
          </Card>
        )
      ) : (
        groupSetsByFamily(sets).map(({ family, sets: familySets }) => (
          <FamilySection
            key={family}
            family={family}
            sets={familySets}
            collapsed={!!collapsed[family]}
            onToggle={() => setCollapsed((prev) => ({ ...prev, [family]: !prev[family] }))}
            onOpenSet={onOpenSet}
          />
        ))
      )}
    </Screen>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest src/ui/LibraryView.test.tsx`
Expected: PASS, all tests.

- [ ] **Step 5: Run the full suite**

Run: `npm test && npm run typecheck`
Expected: PASS, no test failures and no type errors. (`__tests__/app/library.test.tsx` renders the real seeded bundled sets through this component but only asserts on `set-card-*` testIDs and navigation, both unaffected by grouping.)

- [ ] **Step 6: Commit**

```bash
git add src/ui/LibraryView.tsx src/ui/LibraryView.test.tsx
git commit -m "Group the library screen by exam family, add search, trim rows"
```

---

### Task 4: SetDetailView — add the hide action

**Files:**
- Modify: `src/ui/SetDetailView.tsx`
- Modify: `src/ui/SetDetailView.test.tsx`

**Interfaces:**
- Consumes: nothing new.
- Produces: new optional prop `SetDetailView({ onHide?: () => void, ... })` — consumed by Task 5 (`app/set/[setId].tsx`).

- [ ] **Step 1: Write the failing tests**

Add to `src/ui/SetDetailView.test.tsx`, after the existing `'shows and wires edit and export actions when provided'` test:

```ts
  it('shows and wires the delete action when onDelete is provided', async () => {
    const onDelete = jest.fn();
    await render(
      <SetDetailView set={set} attempts={[]} onStart={() => {}} onOpenAttempt={() => {}} onDelete={onDelete} />,
    );
    await fireEvent.press(screen.getByTestId('delete-set'));
    expect(onDelete).toHaveBeenCalled();
  });

  it('shows and wires the hide action, via the same delete-set button, when onHide is provided', async () => {
    const onHide = jest.fn();
    await render(
      <SetDetailView set={set} attempts={[]} onStart={() => {}} onOpenAttempt={() => {}} onHide={onHide} />,
    );
    await fireEvent.press(screen.getByTestId('delete-set'));
    expect(onHide).toHaveBeenCalled();
  });

  it('never renders both the delete and hide actions at once', async () => {
    const onDelete = jest.fn();
    const onHide = jest.fn();
    await render(
      <SetDetailView
        set={set}
        attempts={[]}
        onStart={() => {}}
        onOpenAttempt={() => {}}
        onDelete={onDelete}
        onHide={onHide}
      />,
    );
    expect(screen.getAllByTestId('delete-set')).toHaveLength(1);
    await fireEvent.press(screen.getByTestId('delete-set'));
    expect(onDelete).toHaveBeenCalled();
    expect(onHide).not.toHaveBeenCalled();
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest src/ui/SetDetailView.test.tsx`
Expected: FAIL — `onHide` prop doesn't exist, the second test's button never fires.

- [ ] **Step 3: Implement in `SetDetailView.tsx`**

Change the prop destructuring and type (near the top of the file):

```tsx
export function SetDetailView({
  set,
  attempts,
  onStart,
  onDelete,
  onHide,
  onEdit,
  onExport,
  onOpenAttempt,
}: {
  set: QuestionSet;
  attempts: Attempt[];
  onStart: (mode: RunMode, overrides: RunOverrides) => void;
  onDelete?: () => void;
  onHide?: () => void;
  onEdit?: () => void;
  onExport?: () => void;
  onOpenAttempt: (attemptId: string) => void;
}) {
```

Change the render block at the bottom from:

```tsx
      {onDelete ? (
        <Button title="Delete this set" variant="danger" onPress={onDelete} testID="delete-set" />
      ) : null}
```

to:

```tsx
      {onDelete ? (
        <Button title="Delete this set" variant="danger" onPress={onDelete} testID="delete-set" />
      ) : onHide ? (
        <Button title="Delete this set" variant="danger" onPress={onHide} testID="delete-set" />
      ) : null}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest src/ui/SetDetailView.test.tsx`
Expected: PASS, all tests.

- [ ] **Step 5: Run the full suite**

Run: `npm test && npm run typecheck`
Expected: PASS, no test failures and no type errors.

- [ ] **Step 6: Commit**

```bash
git add src/ui/SetDetailView.tsx src/ui/SetDetailView.test.tsx
git commit -m "Add an onHide action to SetDetailView, sharing the delete button"
```

---

### Task 5: Wire hide into the set-detail route

**Files:**
- Modify: `app/set/[setId].tsx`
- Modify: `__tests__/app/set-detail.test.tsx`

**Interfaces:**
- Consumes: `repository.hideBundledSet` (Task 1), `SetDetailView`'s `onHide` prop (Task 4).
- Produces: nothing new for later tasks.

- [ ] **Step 1: Update the failing/changed tests**

In `__tests__/app/set-detail.test.tsx`, replace the `'hides edit/export/delete for a bundled set'` test with:

```ts
  it('hides edit/export but shows the delete (hide) action for a bundled set', async () => {
    const repository = createTestRepository();
    await repository.saveSet(makeSet({ id: 'bundled-1', title: 'Bundled' }), 'bundled');

    const view = await renderAppRoute(repository, routes, { initialUrl: '/set/bundled-1' });

    await waitFor(() => expect(view.getByText('Bundled')).toBeTruthy());
    expect(view.queryByTestId('edit-set')).toBeNull();
    expect(view.queryByTestId('export-set')).toBeNull();
    expect(view.getByTestId('delete-set')).toBeTruthy();
  });
```

Then add, after the existing `'deletes the set after confirmation and navigates back'` test:

```ts
  it('hides a bundled set after confirmation, keeping its history, and it reappears via restore', async () => {
    const repository = createTestRepository();
    await repository.saveSet(makeSet({ id: 'bundled-1', title: 'Bundled' }), 'bundled');
    await repository.saveAttempt({
      id: 'att_1',
      setId: 'bundled-1',
      setVersion: '1.0.0',
      mode: 'practice',
      startedAt: '2026-09-06T14:00:00.000Z',
      finishedAt: '2026-09-06T14:30:00.000Z',
      config: {
        questionCount: 1,
        timeLimitMinutes: null,
        passingScore: 70,
        shuffleQuestions: true,
        shuffleOptions: true,
        seed: 1,
      },
      score: { correct: 1, total: 1, percent: 100, passed: true },
      byTopic: [{ topicId: 'vpc', correct: 1, total: 1 }],
      answers: [{ questionId: 'q-1', response: [], correct: true, timeMs: 1000 }],
    });

    const view = await renderAppRoute(repository, routes, { initialUrl: '/' });
    await waitFor(() => expect(view.getByTestId('set-card-bundled-1')).toBeTruthy());
    await fireEvent.press(view.getByTestId('set-card-bundled-1'));
    await waitFor(() => expect(view.getByTestId('delete-set')).toBeTruthy());

    await fireEvent.press(view.getByTestId('delete-set'));
    await waitFor(() => expect(view.getByTestId('confirm-dialog')).toBeTruthy());
    await fireEvent.press(view.getByTestId('confirm-button-remove'));

    await waitFor(() => expect(view.getPathname()).toBe('/'));
    const visible = await repository.listSets();
    expect(visible.find((s) => s.id === 'bundled-1')).toBeUndefined();
    const hidden = await repository.listHiddenSets();
    expect(hidden.find((s) => s.id === 'bundled-1')).toBeTruthy();
    expect(await repository.listAttempts('bundled-1')).toHaveLength(1);

    await repository.restoreBundledSet('bundled-1');
    expect((await repository.listSets()).find((s) => s.id === 'bundled-1')).toBeTruthy();
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest __tests__/app/set-detail.test.tsx`
Expected: FAIL — the updated "hides edit/export" test fails because `delete-set` doesn't render for a bundled set yet; the new hide-flow test fails because there's no `confirm-button-remove`.

- [ ] **Step 3: Implement in `app/set/[setId].tsx`**

Remove the `deletable` state and its setter. Change:

```tsx
  const [set, setSet] = useState<QuestionSet | null | undefined>(undefined);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [deletable, setDeletable] = useState(false);
  const [source, setSource] = useState<SetSource | null>(null);
```

to:

```tsx
  const [set, setSet] = useState<QuestionSet | null | undefined>(undefined);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [source, setSource] = useState<SetSource | null>(null);
```

In the `useFocusEffect` callback, remove the `setDeletable(...)` line. Change:

```tsx
        const matched = summaries.find((s) => s.id === setId);
        setDeletable(matched?.source === 'imported');
        setSource(matched?.source ?? null);
```

to:

```tsx
        const matched = summaries.find((s) => s.id === setId);
        setSource(matched?.source ?? null);
```

After the `if (set === null) return <Redirect href="/" />;` block, add the derived flags and the new `hide` function (next to `start`/`begin`/`remove`):

```tsx
  const deletable = source === 'imported';
  const hideable = source === 'bundled';

  const start = async (mode: RunMode, overrides: RunOverrides) => {
```

(`start` stays exactly as it is — only the two `const` lines are new above it.)

Add `hide`, next to the existing `remove` function:

```tsx
  const hide = () => {
    confirm(
      'Remove this free exam?',
      `"${set.title}" will disappear from your library, but your attempt history is kept, and you can bring it back anytime from Settings → Hidden exams.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            await repository.hideBundledSet(set.id);
            router.back();
          },
        },
      ],
    );
  };
```

Finally, update the returned `<SetDetailView>` to pass `onHide`:

```tsx
  return (
    <SetDetailView
      set={set}
      attempts={attempts}
      onStart={start}
      onDelete={deletable ? remove : undefined}
      onHide={hideable ? hide : undefined}
      onEdit={deletable ? () => router.push(`/builder/${encodeURIComponent(set.id)}`) : undefined}
      onExport={deletable ? exportCurrentSet : undefined}
      onOpenAttempt={(attemptId) => router.push(`/results/${encodeURIComponent(attemptId)}`)}
    />
  );
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest __tests__/app/set-detail.test.tsx`
Expected: PASS, all tests.

- [ ] **Step 5: Run the full suite**

Run: `npm test && npm run typecheck`
Expected: PASS, no test failures and no type errors.

- [ ] **Step 6: Commit**

```bash
git add app/set/[setId].tsx __tests__/app/set-detail.test.tsx
git commit -m "Wire the hide-bundled-set flow into the set detail screen"
```

---

### Task 6: SettingsView — "Hidden exams" row

**Files:**
- Modify: `src/ui/SettingsView.tsx`
- Modify: `src/ui/SettingsView.test.tsx`

**Interfaces:**
- Consumes: nothing new.
- Produces: new optional props `SettingsView({ hiddenCount?: number, onOpenHiddenSets?: () => void })` — consumed by Task 7 (`app/(tabs)/settings.tsx`).

- [ ] **Step 1: Write the failing tests**

Add to `src/ui/SettingsView.test.tsx`, after the existing tests (still inside `describe('SettingsView', ...)`):

```ts
  it('renders a "Hidden exams" link with no count badge by default', async () => {
    await render(
      <ThemeModeProvider store={createMemoryKv()}>
        <SettingsView />
      </ThemeModeProvider>,
    );
    expect(screen.getByText('Hidden exams')).toBeTruthy();
  });

  it('shows a count badge and calls onOpenHiddenSets when pressed', async () => {
    const onOpenHiddenSets = jest.fn();
    await render(
      <ThemeModeProvider store={createMemoryKv()}>
        <SettingsView hiddenCount={2} onOpenHiddenSets={onOpenHiddenSets} />
      </ThemeModeProvider>,
    );
    expect(screen.getByText('Hidden exams (2)')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('hidden-exams-link'));
    expect(onOpenHiddenSets).toHaveBeenCalled();
  });
```

This file's imports already include `fireEvent`, `jest` is not currently imported — add it to the existing `@jest/globals` import line:

```ts
import { afterEach, describe, expect, it, jest } from '@jest/globals';
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest src/ui/SettingsView.test.tsx`
Expected: FAIL — no "Hidden exams" text/testID exists yet.

- [ ] **Step 3: Implement in `SettingsView.tsx`**

Replace the whole file with:

```tsx
import { Text, View } from 'react-native';
import { Button } from './Button';
import { Screen } from './Screen';
import { type ThemeMode, useThemeMode } from './ThemeModeProvider';
import { spacing, type, useTheme } from './theme';

const OPTIONS: { mode: ThemeMode; label: string }[] = [
  { mode: 'light', label: 'Light' },
  { mode: 'dark', label: 'Dark' },
  { mode: 'system', label: 'System' },
];

export function SettingsView({
  hiddenCount = 0,
  onOpenHiddenSets = () => {},
}: {
  hiddenCount?: number;
  onOpenHiddenSets?: () => void;
}) {
  const theme = useTheme();
  const { mode, setMode } = useThemeMode();

  return (
    <Screen>
      <Text style={[type.title, { color: theme.text }]}>Settings</Text>
      <Text style={[type.label, { color: theme.textMuted }]}>Theme</Text>
      <View style={{ gap: spacing.sm }}>
        {OPTIONS.map((option) => (
          <Button
            key={option.mode}
            title={option.label}
            variant={mode === option.mode ? 'highlight' : 'secondary'}
            onPress={() => setMode(option.mode)}
            testID={`theme-mode-${option.mode}`}
          />
        ))}
      </View>

      <Text style={[type.label, { color: theme.textMuted }]}>Library</Text>
      <Button
        title={hiddenCount > 0 ? `Hidden exams (${hiddenCount})` : 'Hidden exams'}
        variant="secondary"
        onPress={onOpenHiddenSets}
        testID="hidden-exams-link"
      />
    </Screen>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest src/ui/SettingsView.test.tsx`
Expected: PASS, all tests.

- [ ] **Step 5: Run the full suite**

Run: `npm test && npm run typecheck`
Expected: PASS, no test failures and no type errors.

- [ ] **Step 6: Commit**

```bash
git add src/ui/SettingsView.tsx src/ui/SettingsView.test.tsx
git commit -m "Add a Hidden exams row to Settings"
```

---

### Task 7: Wire hidden count into the settings route

**Files:**
- Modify: `app/(tabs)/settings.tsx`
- Modify: `__tests__/app/settings.test.tsx`

**Interfaces:**
- Consumes: `repository.listHiddenSets` (Task 1), `SettingsView`'s new props (Task 6).
- Produces: navigates to `/hidden-sets` (route added in Task 9 — until then this is a `router.push` to a path with no matching screen in the *real app*, which is fine since Task 9 lands before this is shippable; the route test for this task stubs the target screen).

- [ ] **Step 1: Write the failing test**

In `__tests__/app/settings.test.tsx`, add a stub screen and a route entry, and a new test. Change:

```ts
import { afterEach, describe, expect, it } from '@jest/globals';
import { cleanup, fireEvent, waitFor } from '@testing-library/react-native';
import SettingsScreen from '../../app/(tabs)/settings';
import { createMemoryKv } from '@/data/kv';
import { KEY_PREFIX } from '@/data/storage';
import { darkTheme } from '@/ui/theme';
import { createTestRepository, renderAppRoute } from '../helpers/renderRoute';

afterEach(() => {
  cleanup();
});

const routes = { settings: SettingsScreen };
```

to:

```ts
import { afterEach, describe, expect, it } from '@jest/globals';
import { cleanup, fireEvent, waitFor } from '@testing-library/react-native';
import { Text } from 'react-native';
import SettingsScreen from '../../app/(tabs)/settings';
import type { QuestionSet } from '@/core/schema';
import { createMemoryKv } from '@/data/kv';
import { KEY_PREFIX } from '@/data/storage';
import { darkTheme } from '@/ui/theme';
import { createTestRepository, renderAppRoute } from '../helpers/renderRoute';

afterEach(() => {
  cleanup();
});

function StubHiddenSetsScreen() {
  return <Text>stub hidden sets screen</Text>;
}

const routes = { settings: SettingsScreen, 'hidden-sets': StubHiddenSetsScreen };

const makeSet = (over: Partial<QuestionSet> = {}): QuestionSet =>
  ({
    schemaVersion: 1,
    id: 'bundled-1',
    title: 'Bundled',
    topics: [],
    exam: { questionCount: 1, timeLimitMinutes: null, passingScore: 70 },
    questions: [{ id: 'q-1', type: 'boolean', prompt: 'True?', answer: true }],
    ...over,
  }) as QuestionSet;
```

Then add, at the end of `describe('Settings screen (app/(tabs)/settings.tsx)', ...)`:

```ts
  it('shows a hidden-exams count and navigates there when tapped', async () => {
    const repository = createTestRepository();
    await repository.saveSet(makeSet(), 'bundled');
    await repository.hideBundledSet('bundled-1');

    const view = await renderAppRoute(repository, routes, { initialUrl: '/settings' });
    await waitFor(() => expect(view.getByText('Hidden exams (1)')).toBeTruthy());

    await fireEvent.press(view.getByTestId('hidden-exams-link'));

    await waitFor(() => expect(view.getPathname()).toBe('/hidden-sets'));
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest __tests__/app/settings.test.tsx`
Expected: FAIL — the settings screen doesn't pass `hiddenCount`/`onOpenHiddenSets` yet, so the count never shows and the press does nothing.

- [ ] **Step 3: Implement in `app/(tabs)/settings.tsx`**

Replace the whole file with:

```tsx
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { useRepository, useRepositoryReady } from '@/data/RepositoryProvider';
import { SettingsView } from '@/ui/SettingsView';

export default function SettingsScreen() {
  const repository = useRepository();
  const ready = useRepositoryReady();
  const router = useRouter();
  const [hiddenCount, setHiddenCount] = useState(0);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      if (!ready) return;
      repository.listHiddenSets().then((hidden) => {
        if (!cancelled) setHiddenCount(hidden.length);
      });
      return () => {
        cancelled = true;
      };
    }, [repository, ready]),
  );

  return <SettingsView hiddenCount={hiddenCount} onOpenHiddenSets={() => router.push('/hidden-sets')} />;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest __tests__/app/settings.test.tsx`
Expected: PASS, all tests.

- [ ] **Step 5: Run the full suite**

Run: `npm test && npm run typecheck`
Expected: PASS, no test failures and no type errors.

- [ ] **Step 6: Commit**

```bash
git add "app/(tabs)/settings.tsx" __tests__/app/settings.test.tsx
git commit -m "Wire the hidden-exams count and link into the settings screen"
```

---

### Task 8: HiddenSetsView component

**Files:**
- Create: `src/ui/HiddenSetsView.tsx`
- Create: `src/ui/HiddenSetsView.test.tsx`

**Interfaces:**
- Consumes: `SetSummary` from `@/data/repository` (existing type).
- Produces: `HiddenSetsView({ sets: SetSummary[], loading: boolean, onRestore: (setId: string) => void })` — consumed by Task 9 (`app/hidden-sets.tsx`).

- [ ] **Step 1: Write the failing tests**

Create `src/ui/HiddenSetsView.test.tsx`:

```tsx
import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react-native';
import type { SetSummary } from '@/data/repository';
import { HiddenSetsView } from './HiddenSetsView';

const summary = (over: Partial<SetSummary> = {}): SetSummary => ({
  id: 'set-1',
  title: 'Security+',
  description: null,
  version: null,
  questionCount: 90,
  topicCount: 5,
  source: 'bundled',
  attemptCount: 0,
  bestPercent: null,
  lastAttemptAt: null,
  ...over,
});

describe('HiddenSetsView', () => {
  it('shows a loading indicator while loading', async () => {
    await render(<HiddenSetsView sets={[]} loading onRestore={() => {}} />);
    expect(screen.getByTestId('hidden-sets-loading')).toBeTruthy();
  });

  it('shows an empty state when there are no hidden sets', async () => {
    await render(<HiddenSetsView sets={[]} loading={false} onRestore={() => {}} />);
    expect(screen.getByText('No hidden exams.')).toBeTruthy();
  });

  it('lists each hidden set with a Restore button that calls onRestore with its id', async () => {
    const onRestore = jest.fn();
    await render(<HiddenSetsView sets={[summary()]} loading={false} onRestore={onRestore} />);
    expect(screen.getByText('Security+')).toBeTruthy();
    expect(screen.getByText('90 questions')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('restore-set-set-1'));
    expect(onRestore).toHaveBeenCalledWith('set-1');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest src/ui/HiddenSetsView.test.tsx`
Expected: FAIL — `./HiddenSetsView` does not exist yet.

- [ ] **Step 3: Create `HiddenSetsView.tsx`**

```tsx
import { ActivityIndicator, Text, View } from 'react-native';
import type { SetSummary } from '@/data/repository';
import { Button } from './Button';
import { Card } from './Card';
import { ListRow } from './ListRow';
import { Screen } from './Screen';
import { spacing, type, useTheme } from './theme';

export function HiddenSetsView({
  sets,
  loading,
  onRestore,
}: {
  sets: SetSummary[];
  loading: boolean;
  onRestore: (setId: string) => void;
}) {
  const theme = useTheme();

  return (
    <Screen>
      <View style={{ gap: spacing.xs }}>
        <Text style={[type.title, { color: theme.text }]}>Hidden exams</Text>
        <Text style={[type.caption, { color: theme.textMuted }]}>
          Free exams you've hidden from your library. Restoring brings back their attempt history too.
        </Text>
      </View>

      {loading ? (
        <ActivityIndicator testID="hidden-sets-loading" />
      ) : sets.length === 0 ? (
        <Card>
          <Text style={[type.body, { color: theme.text }]}>No hidden exams.</Text>
        </Card>
      ) : (
        <Card>
          {sets.map((set, index) => (
            <ListRow key={set.id} testID={`hidden-set-${set.id}`} isLast={index === sets.length - 1}>
              <Text style={[type.heading, { color: theme.text }]}>{set.title}</Text>
              <Text style={[type.caption, { color: theme.textMuted }]}>{`${set.questionCount} questions`}</Text>
              <Button
                title="Restore"
                variant="secondary"
                onPress={() => onRestore(set.id)}
                testID={`restore-set-${set.id}`}
              />
            </ListRow>
          ))}
        </Card>
      )}
    </Screen>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest src/ui/HiddenSetsView.test.tsx`
Expected: PASS, all tests.

- [ ] **Step 5: Run the full suite**

Run: `npm test && npm run typecheck`
Expected: PASS, no test failures and no type errors.

- [ ] **Step 6: Commit**

```bash
git add src/ui/HiddenSetsView.tsx src/ui/HiddenSetsView.test.tsx
git commit -m "Add the HiddenSetsView component"
```

---

### Task 9: Hidden-exams route

**Files:**
- Create: `app/hidden-sets.tsx`
- Create: `__tests__/app/hidden-sets.test.tsx`
- Modify: `app/_layout.tsx`

**Interfaces:**
- Consumes: `repository.listHiddenSets`/`restoreBundledSet` (Task 1), `HiddenSetsView` (Task 8).
- Produces: the live `/hidden-sets` route — closes the loop with Task 7's `router.push('/hidden-sets')`.

- [ ] **Step 1: Write the failing tests**

Create `__tests__/app/hidden-sets.test.tsx`:

```tsx
import { afterEach, describe, expect, it } from '@jest/globals';
import { cleanup, fireEvent, waitFor } from '@testing-library/react-native';
import HiddenSetsScreen from '../../app/hidden-sets';
import type { QuestionSet } from '@/core/schema';
import { createTestRepository, renderAppRoute } from '../helpers/renderRoute';

afterEach(() => {
  cleanup();
});

const routes = { 'hidden-sets': HiddenSetsScreen };

const makeSet = (over: Partial<QuestionSet> = {}): QuestionSet =>
  ({
    schemaVersion: 1,
    id: 'bundled-1',
    title: 'Bundled Exam',
    topics: [],
    exam: { questionCount: 1, timeLimitMinutes: null, passingScore: 70 },
    questions: [{ id: 'q-1', type: 'boolean', prompt: 'True?', answer: true }],
    ...over,
  }) as QuestionSet;

describe('Hidden exams screen (app/hidden-sets.tsx)', () => {
  it('shows an empty state with no hidden sets', async () => {
    const repository = createTestRepository();
    const view = await renderAppRoute(repository, routes, { initialUrl: '/hidden-sets' });
    await waitFor(() => expect(view.getByText('No hidden exams.')).toBeTruthy());
  });

  it('lists a hidden set and removes it from the list after Restore is pressed', async () => {
    const repository = createTestRepository();
    await repository.saveSet(makeSet(), 'bundled');
    await repository.hideBundledSet('bundled-1');

    const view = await renderAppRoute(repository, routes, { initialUrl: '/hidden-sets' });
    await waitFor(() => expect(view.getByText('Bundled Exam')).toBeTruthy());

    await fireEvent.press(view.getByTestId('restore-set-bundled-1'));

    await waitFor(() => expect(view.queryByText('Bundled Exam')).toBeNull());
    const sets = await repository.listSets();
    expect(sets.find((s) => s.id === 'bundled-1')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest __tests__/app/hidden-sets.test.tsx`
Expected: FAIL — `../../app/hidden-sets` does not exist yet.

- [ ] **Step 3: Create `app/hidden-sets.tsx`**

```tsx
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { useRepository, useRepositoryReady } from '@/data/RepositoryProvider';
import type { SetSummary } from '@/data/repository';
import { HiddenSetsView } from '@/ui/HiddenSetsView';

export default function HiddenSetsScreen() {
  const repository = useRepository();
  const ready = useRepositoryReady();
  const [sets, setSets] = useState<SetSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      if (!ready) return;
      setLoading(true);
      repository.listHiddenSets().then((result) => {
        if (!cancelled) {
          setSets(result);
          setLoading(false);
        }
      });
      return () => {
        cancelled = true;
      };
    }, [repository, ready]),
  );

  const restore = async (setId: string) => {
    await repository.restoreBundledSet(setId);
    setSets((prev) => prev.filter((s) => s.id !== setId));
  };

  return <HiddenSetsView sets={sets} loading={loading} onRestore={restore} />;
}
```

- [ ] **Step 4: Register the route in `app/_layout.tsx`**

Add a `Stack.Screen` entry alongside the other top-level routes. Change:

```tsx
              <Stack.Screen name="import" options={{ title: 'Import a set', presentation: 'modal' }} />
              <Stack.Screen name="builder/new" options={{ title: 'Create a set', presentation: 'modal' }} />
              <Stack.Screen name="builder/[setId]" options={{ title: 'Edit set' }} />
```

to:

```tsx
              <Stack.Screen name="import" options={{ title: 'Import a set', presentation: 'modal' }} />
              <Stack.Screen name="builder/new" options={{ title: 'Create a set', presentation: 'modal' }} />
              <Stack.Screen name="builder/[setId]" options={{ title: 'Edit set' }} />
              <Stack.Screen name="hidden-sets" options={{ title: 'Hidden exams' }} />
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx jest __tests__/app/hidden-sets.test.tsx`
Expected: PASS, all tests.

- [ ] **Step 6: Run the full suite**

Run: `npm test`
Expected: PASS — 55+ suites, all green (this task adds one new suite).

- [ ] **Step 7: Run typecheck and lint**

Run: `npx tsc --noEmit && npx eslint .`
Expected: no errors (this is the last code task — a good point to catch anything the per-task test runs didn't).

- [ ] **Step 8: Commit**

```bash
git add app/hidden-sets.tsx __tests__/app/hidden-sets.test.tsx "app/_layout.tsx"
git commit -m "Add the hidden-exams route"
```

---

### Task 10: Manual browser verification

**Files:** none (verification only, no code changes).

**Interfaces:** none.

- [ ] **Step 1: Start a fresh dev server**

Run: `CI=1 npx expo start --web --clear` (per this project's standing note: a running dev server has no file watcher, so start it fresh now that all code tasks are committed, rather than reusing one left over from earlier).

- [ ] **Step 2: Verify grouping and collapse**

Open the app in the browser (puppeteer-core + google-chrome-stable, per this project's standing browser-testing setup). On the library screen, confirm: sets appear under family section headers (A+ Core 1, A+ Core 2, Security+, Network+, Samples, My sets — in that order, "My sets" only if you have an imported/created set), each header shows a count, and clicking a header collapses/expands its sets.

- [ ] **Step 3: Verify search**

Type a partial exam name into the search box. Confirm matching sets show in a flat list (no section headers) across families, and clearing the box returns to the grouped view.

- [ ] **Step 4: Verify hiding and restoring a bundled set**

Open a free bundled exam (e.g. a quick practice set), tap "Delete this set", confirm the dialog reads "Remove this free exam?" and mentions it can be restored, tap "Remove". Confirm it disappears from the library. Go to Settings → "Hidden exams (1)", confirm it's listed, tap "Restore", confirm it reappears in the library in its original family section with any prior attempt history intact.

- [ ] **Step 5: Verify deleting an imported set still works unchanged**

Create or import a set, delete it from its detail screen, confirm the existing "permanent" confirm copy still shows (not the new "Remove this free exam?" copy) and the set is gone for good (not offered in Hidden exams).

- [ ] **Step 6: Check the browser console**

Confirm zero new console errors/warnings introduced by this change (per this project's history of react-native-web-only bugs that only surface in a real browser, not in Jest/RNTL).

- [ ] **Step 7: Report**

Note the outcome of each check above (pass/fail with details) — this is the evidence gate before the branch review and merge.

---
