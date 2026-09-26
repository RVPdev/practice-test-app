# Visual Redesign (Phase 2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the generic blue, flat, system-font look with a navy+amber palette, elevation, and a Sora/Inter type scale, and fix the "everything's a card" pattern in the two list screens.

**Architecture:** Every value lives in the existing `src/ui/theme.ts` — no new theme folder, no new component-contract system. `Theme` gains a `highlight`/`highlightText` pair alongside the redefined `accent`/`accentText`; a new `shadows` export holds two `boxShadow` string levels; `type` keeps its five existing keys but swaps `fontWeight` for `fontFamily`. A small number of "selected/current" call sites move from `accent` to the new `highlight` token — enumerated below, not rediscovered. One new component, `ListRow`, is added (mirrors `Card`'s children-based API) so `LibraryView`/`HistoryView` stop wrapping every list item in its own shadowed `Card`.

**Tech Stack:** Expo Router, React Native 0.86 (`boxShadow` style prop), `expo-font` + `@expo-google-fonts/sora` + `@expo-google-fonts/inter`, Jest + `@testing-library/react-native`.

**Spec:** `docs/superpowers/specs/2026-09-26-visual-redesign-phase2-design.md`

## Global Constraints

- `accent`/`accentText`: light `#1e3a5f` / `#ffffff`; dark `#3a5d8a` / `#ffffff`.
- `highlight`/`highlightText` (new): light `#c2760c` / `#ffffff`; dark `#f0a839` / `#1e1b4b`.
- `positive`/`positiveSurface`/`negative`/`negativeSurface` are **unchanged** in both palettes.
- `shadows.card = '0 1px 2px rgba(0, 0, 0, 0.06)'`, `shadows.raised = '0 4px 12px rgba(0, 0, 0, 0.12)'` — the cross-platform `boxShadow` style-prop string, never `shadowColor`/`elevation`. `raised` is defined for future use; this plan does not require applying it anywhere.
- `type` keeps its 5 keys (`title/heading/body/label/caption/mono`); each gets a `fontFamily` and drops `fontWeight` entirely (mixing the two causes fake-bold synthesis against a custom font file): `title`→`Sora_700Bold`, `heading`→`Sora_600SemiBold`, `body`→`Inter_400Regular`, `label`→`Inter_600SemiBold`, `caption`→`Inter_400Regular`, `mono`→`Inter_600SemiBold` (keep `fontVariant: ['tabular-nums']` on `mono`).
- `useTheme()`'s signature and the shape of `lightTheme`/`darkTheme` (as a superset of before) are the only theme.ts exports every other file relies on — no existing call site of `useTheme()` itself needs editing.
- The 4 enumerated `accent`→`highlight` call sites (Task 3) are the only intentional color-semantic changes outside `theme.ts`/`Card.tsx`/`ListRow.tsx`. `Button.tsx`'s primary variant, `Feedback.tsx`'s reference link, and `ProgressBar.tsx`'s neutral tone stay on `accent` — they are structural/primary, not "selection".
- No new component variant/size/state contracts beyond `ListRow`, and no styling library — rejected in the spec's approach section.
- `ListRow` mirrors `Card`'s existing API shape: `children`, optional `onPress`, `testID`, `style` (merged last) — plus one new prop, `isLast`, to suppress the bottom hairline on the final row of a list.

## Review Focus

- An amber `highlight` border/dot must stay visually distinguishable from the neutral `border` color on both a light `surface` (`#ffffff`) and a dark `surfaceAlt` (`#22272f`) background — not just "a different hex on paper". → Task 8 (manual browser verification), flag any site that reads poorly.
- `ListRow`'s bottom-hairline suppression must be checked against a real, odd-length bundled set/attempt list, not just a 1–2-item unit-test fixture, since an off-by-one in `isLast` calculation would only show up with 3+ real items. → Task 6 implementation, verified live in Task 8.
- The existing `onOpenSet`/`onOpenAttempt` press behavior must keep firing identically now that the press handler lives on `ListRow` instead of `Card` — a dropped `onPress` wire would compile fine and fail silently. → Task 6's unmodified existing tests must still pass.
- The `useFonts` loading gate in `app/_layout.tsx` must not permanently blank the app if font loading ever errors (a corrupted bundled asset, however unlikely) — it must fall through to rendering with the OS-fallback font rather than hang on a blank screen forever. → Task 4 checks the hook's error result, not just its loaded boolean.
- A "selected" call site could still reference `theme.accent` under a different local binding (e.g. a destructured `const { accent } = theme`) that a narrow grep for the 4 already-known sites would miss. → Task 7 re-runs a broad `\.accent\b` grep across all of `src/ui`/`app`, not just the enumerated 4.

---

### Task 1: `theme.ts` — navy/amber colors + shadow tokens

**Files:**
- Modify: `src/ui/theme.ts`
- Modify: `src/ui/theme.test.tsx`

**Interfaces:**
- Produces: `Theme` type gains `highlight: string; highlightText: string;`. New `export const shadows = { card: string; raised: string }`. `lightTheme`/`darkTheme` gain the two new fields; `accent`/`accentText` values change. `useTheme()` signature unchanged.

- [ ] **Step 1: Write the failing tests**

Change the import line at the top of `src/ui/theme.test.tsx`:

```ts
import { darkTheme, lightTheme, shadows, useTheme } from './theme';
```

Add these two `describe` blocks at the end of the file:

```tsx
describe('palette (Phase 2: navy + amber)', () => {
  it('uses navy for the structural accent and amber for the highlight, in both modes', () => {
    expect(lightTheme.accent).toBe('#1e3a5f');
    expect(lightTheme.accentText).toBe('#ffffff');
    expect(lightTheme.highlight).toBe('#c2760c');
    expect(lightTheme.highlightText).toBe('#ffffff');

    expect(darkTheme.accent).toBe('#3a5d8a');
    expect(darkTheme.accentText).toBe('#ffffff');
    expect(darkTheme.highlight).toBe('#f0a839');
    expect(darkTheme.highlightText).toBe('#1e1b4b');
  });

  it('leaves correctness colors untouched by the new brand palette', () => {
    expect(lightTheme.positive).toBe('#1c7a4a');
    expect(lightTheme.negative).toBe('#b3261e');
    expect(darkTheme.positive).toBe('#5fd39b');
    expect(darkTheme.negative).toBe('#ff8a80');
  });
});

describe('shadows', () => {
  it('exports card and raised elevation levels as boxShadow strings', () => {
    expect(shadows.card).toBe('0 1px 2px rgba(0, 0, 0, 0.06)');
    expect(shadows.raised).toBe('0 4px 12px rgba(0, 0, 0, 0.12)');
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx jest src/ui/theme.test.tsx`
Expected: FAIL — `lightTheme.accent` is still `'#2f5bd7'`, `shadows` is not exported.

- [ ] **Step 3: Write the implementation**

In `src/ui/theme.ts`, change the `Theme` type and both palette objects, and add the `shadows` export (everything else in the file — `spacing`, `radius`, `type`, `useTheme()` — is untouched in this task):

```ts
export type Theme = {
  background: string;
  surface: string;
  surfaceAlt: string;
  border: string;
  text: string;
  textMuted: string;
  accent: string;
  accentText: string;
  highlight: string;
  highlightText: string;
  positive: string;
  positiveSurface: string;
  negative: string;
  negativeSurface: string;
};

export const shadows = {
  card: '0 1px 2px rgba(0, 0, 0, 0.06)',
  raised: '0 4px 12px rgba(0, 0, 0, 0.12)',
} as const;

export const lightTheme: Theme = {
  background: '#f6f7f9',
  surface: '#ffffff',
  surfaceAlt: '#eef0f4',
  border: '#d9dde4',
  text: '#12161c',
  textMuted: '#5d6472',
  accent: '#1e3a5f',
  accentText: '#ffffff',
  highlight: '#c2760c',
  highlightText: '#ffffff',
  positive: '#1c7a4a',
  positiveSurface: '#e4f4ea',
  negative: '#b3261e',
  negativeSurface: '#fbe6e4',
};

export const darkTheme: Theme = {
  background: '#0f1216',
  surface: '#181c22',
  surfaceAlt: '#22272f',
  border: '#2d333c',
  text: '#f2f4f7',
  textMuted: '#a2abb8',
  accent: '#3a5d8a',
  accentText: '#ffffff',
  highlight: '#f0a839',
  highlightText: '#1e1b4b',
  positive: '#5fd39b',
  positiveSurface: '#123526',
  negative: '#ff8a80',
  negativeSurface: '#3a1a17',
};
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx jest src/ui/theme.test.tsx`
Expected: PASS (5 tests)

Then run the full suite once — `SettingsView.test.tsx` and `__tests__/app/settings.test.tsx` read `darkTheme.accentText` from the live export rather than a hardcoded hex, so they should be unaffected by the value change:

Run: `npx jest`
Expected: PASS (no regressions)

- [ ] **Step 5: Commit**

```bash
git add src/ui/theme.ts src/ui/theme.test.tsx
git commit -m "theme: navy+amber palette and elevation tokens"
```

---

### Task 2: `Card` gets elevation

**Files:**
- Modify: `src/ui/Card.tsx`
- Create: `src/ui/Card.test.tsx`

**Interfaces:**
- Consumes: `shadows` (Task 1).
- Produces: no prop/signature change to `Card` — same `children`/`onPress`/`testID`/`style`.

- [ ] **Step 1: Write the failing tests**

```tsx
// src/ui/Card.test.tsx
import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import { Card } from './Card';
import { shadows } from './theme';

describe('Card', () => {
  it('renders its children', async () => {
    await render(
      <Card testID="card-1">
        <Text>Hello</Text>
      </Card>,
    );
    expect(screen.getByText('Hello')).toBeTruthy();
  });

  it('applies the card elevation shadow', async () => {
    await render(
      <Card testID="card-1">
        <Text>Hello</Text>
      </Card>,
    );
    expect(screen.getByTestId('card-1').props.style).toEqual(
      expect.arrayContaining([expect.objectContaining({ boxShadow: shadows.card })]),
    );
  });

  it('calls onPress when pressable', async () => {
    const onPress = jest.fn();
    await render(
      <Card testID="card-1" onPress={onPress}>
        <Text>Hello</Text>
      </Card>,
    );
    await fireEvent.press(screen.getByTestId('card-1'));
    expect(onPress).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx jest src/ui/Card.test.tsx`
Expected: The "applies the card elevation shadow" test FAILs — `styles.card` has no `boxShadow` yet. The other two pass already (they're characterization tests for existing behavior).

- [ ] **Step 3: Write the implementation**

In `src/ui/Card.tsx`, add `shadows` to the import and add one line to `styles.card`:

```ts
import { radius, shadows, spacing, useTheme } from './theme';
```

```ts
const styles = StyleSheet.create({
  card: {
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing.xs,
    boxShadow: shadows.card,
  },
});
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx jest src/ui/Card.test.tsx`
Expected: PASS (3 tests)

Run: `npx jest`
Expected: PASS (no regressions — no existing test inspects `Card`'s exact style array)

- [ ] **Step 5: Commit**

```bash
git add src/ui/Card.tsx src/ui/Card.test.tsx
git commit -m "Card: apply the card elevation shadow"
```

---

### Task 3: Move "selected"/"current" states from `accent` to `highlight`

**Files:**
- Modify: `src/ui/QuestionCard.tsx`
- Modify: `src/ui/QuestionMetaFields.tsx`
- Modify: `src/ui/MatchingQuestionEditor.tsx`
- Modify: `src/ui/QuestionGrid.tsx`
- Modify: `src/ui/QuestionCard.test.tsx`
- Modify: `src/ui/QuestionMetaFields.test.tsx`
- Modify: `src/ui/MatchingQuestionEditor.test.tsx`
- Modify: `src/ui/QuestionGrid.test.tsx`

**Interfaces:**
- Consumes: `theme.highlight`/`theme.highlightText` (Task 1).
- Produces: no prop/signature changes to any of the 4 components.

- [ ] **Step 1: Write the failing tests**

Add `import { lightTheme } from './theme';` to each of the 4 test files, then add one test to each:

```tsx
// src/ui/QuestionCard.test.tsx — add inside the first `describe('QuestionCard', ...)` block
it('marks a selected, unrevealed option with the highlight color', async () => {
  await render(
    <QuestionCard question={single} response={['a']} revealed={false} optionOrder={['a', 'b']} onChange={() => {}} />,
  );
  expect(screen.getByTestId('option-a').props.style).toEqual(
    expect.objectContaining({ borderColor: lightTheme.highlight }),
  );
});
```

```tsx
// src/ui/QuestionMetaFields.test.tsx — add as a new test in the `describe('QuestionMetaFields', ...)` block
it('marks a selected topic chip with the highlight color', async () => {
  await render(
    <QuestionMetaFields
      topics={topics}
      topicId="hardware"
      difficulty={undefined}
      explanation={undefined}
      onChangeTopicId={noop}
      onChangeDifficulty={noop}
      onChangeExplanation={noop}
    />,
  );
  expect(screen.getByTestId('topic-chip-hardware').props.style).toEqual(
    expect.objectContaining({ borderColor: lightTheme.highlight, backgroundColor: lightTheme.highlight }),
  );
});
```

```tsx
// src/ui/MatchingQuestionEditor.test.tsx — add as a new test
it('marks a selected left chip with the highlight color', async () => {
  await render(<MatchingQuestionEditor question={question} topics={topics} onChange={jest.fn()} />);
  await fireEvent.press(screen.getByTestId('pair-left-chip-l1'));
  expect(screen.getByTestId('pair-left-chip-l1').props.style).toEqual(
    expect.objectContaining({ borderColor: lightTheme.highlight }),
  );
});
```

```tsx
// src/ui/QuestionGrid.test.tsx — add as a new test
it('marks the current cell with the highlight color', async () => {
  await render(<QuestionGrid state={state} onGoto={() => {}} />);
  expect(screen.getByTestId('grid-cell-1').props.style).toEqual(
    expect.objectContaining({ borderColor: lightTheme.highlight }),
  );
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx jest src/ui/QuestionCard.test.tsx src/ui/QuestionMetaFields.test.tsx src/ui/MatchingQuestionEditor.test.tsx src/ui/QuestionGrid.test.tsx`
Expected: FAIL — all 4 new tests fail, each site still resolves `theme.accent`, not `theme.highlight`.

- [ ] **Step 3: Write the implementation**

In `src/ui/QuestionCard.tsx`, in `ChoiceList`'s `border` calculation:

```ts
        const border = revealed
          ? choice.correct
            ? theme.positive
            : selected
              ? theme.negative
              : theme.border
          : selected
            ? theme.highlight
            : theme.border;
```

In `src/ui/QuestionMetaFields.tsx`, `chipStyle`/`chipTextColor`:

```ts
  const chipStyle = (selected: boolean) => ({
    padding: spacing.sm,
    borderRadius: radius.sm,
    borderWidth: selected ? 2 : 1,
    borderColor: selected ? theme.highlight : theme.border,
    backgroundColor: selected ? theme.highlight : theme.surface,
  });

  const chipTextColor = (selected: boolean) => (selected ? theme.highlightText : theme.text);
```

In `src/ui/MatchingQuestionEditor.tsx`, the left-chip `style`:

```ts
              style={{
                padding: spacing.sm,
                borderRadius: radius.sm,
                borderWidth: selectedLeft === item.id ? 2 : 1,
                borderColor: selectedLeft === item.id ? theme.highlight : theme.border,
              }}
```

In `src/ui/QuestionGrid.tsx`, the cell `style`:

```ts
            style={{
              width: 40,
              height: 40,
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: radius.sm,
              borderWidth: current ? 2 : 1,
              borderColor: current ? theme.highlight : theme.border,
              backgroundColor: answered ? theme.surfaceAlt : theme.surface,
            }}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx jest src/ui/QuestionCard.test.tsx src/ui/QuestionMetaFields.test.tsx src/ui/MatchingQuestionEditor.test.tsx src/ui/QuestionGrid.test.tsx`
Expected: PASS

Run: `npx jest`
Expected: PASS (no regressions — none of these files' other tests, nor `SettingsView`/`settings.test.tsx`, assert `theme.accent` for these components)

- [ ] **Step 5: Commit**

```bash
git add src/ui/QuestionCard.tsx src/ui/QuestionMetaFields.tsx src/ui/MatchingQuestionEditor.tsx src/ui/QuestionGrid.tsx src/ui/QuestionCard.test.tsx src/ui/QuestionMetaFields.test.tsx src/ui/MatchingQuestionEditor.test.tsx src/ui/QuestionGrid.test.tsx
git commit -m "Move selected/current-state color from accent to the new highlight token"
```

---

### Task 4: Typography — Sora + Inter

**Files:**
- Modify: `package.json` (via `npx expo install`)
- Modify: `src/ui/theme.ts`
- Modify: `src/ui/theme.test.tsx`
- Modify: `app/_layout.tsx`

**Interfaces:**
- Consumes: nothing new.
- Produces: no signature change to `useTheme()`; `type`'s value shapes change (fontFamily instead of fontWeight) but its 5 key names don't.

- [ ] **Step 1: Install the font packages**

Run: `npx expo install @expo-google-fonts/sora @expo-google-fonts/inter`
Expected: both added to `package.json` `dependencies` at SDK-57-compatible versions (`expo-font` is already a dependency).

- [ ] **Step 2: Write the failing test**

Add `type` to the theme.test.tsx import (now `import { darkTheme, lightTheme, shadows, type, useTheme } from './theme';`) and add:

```tsx
describe('type scale', () => {
  it('uses Sora for headings and Inter for body text, via loaded font files rather than a synthesized weight', () => {
    expect(type.title).toMatchObject({ fontFamily: 'Sora_700Bold' });
    expect(type.heading).toMatchObject({ fontFamily: 'Sora_600SemiBold' });
    expect(type.body).toMatchObject({ fontFamily: 'Inter_400Regular' });
    expect(type.label).toMatchObject({ fontFamily: 'Inter_600SemiBold' });
    expect(type.caption).toMatchObject({ fontFamily: 'Inter_400Regular' });
    expect(type.mono).toMatchObject({ fontFamily: 'Inter_600SemiBold' });
    expect(type.title).not.toHaveProperty('fontWeight');
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npx jest src/ui/theme.test.tsx`
Expected: FAIL — `type.title.fontFamily` is `undefined`, `type.title` still has `fontWeight`.

- [ ] **Step 4: Update the type scale**

Replace the `type` export in `src/ui/theme.ts`:

```ts
export const type = {
  title: { fontSize: 26, fontFamily: 'Sora_700Bold', lineHeight: 32 },
  heading: { fontSize: 19, fontFamily: 'Sora_600SemiBold', lineHeight: 25 },
  body: { fontSize: 16, fontFamily: 'Inter_400Regular', lineHeight: 23 },
  label: { fontSize: 14, fontFamily: 'Inter_600SemiBold', lineHeight: 19 },
  caption: { fontSize: 13, fontFamily: 'Inter_400Regular', lineHeight: 18 },
  // `as const` sits on the element, not the array: React Native's TextStyle wants a
  // mutable `FontVariant[]`, so a `readonly` tuple would not narrow.
  mono: { fontSize: 18, fontFamily: 'Inter_600SemiBold', fontVariant: ['tabular-nums' as const] },
};
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx jest src/ui/theme.test.tsx`
Expected: PASS (6 tests)

- [ ] **Step 6: Load the fonts in the root layout**

In `app/_layout.tsx`, add the font imports and gate `RootLayout` on `useFonts` (nothing else in the file changes — `AppRoot`, the `Stack`, `useBlurOnNavigateWeb` stay as they are):

```tsx
import { Stack, usePathname } from 'expo-router';
import { useFonts } from 'expo-font';
import { Inter_400Regular, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { Sora_600SemiBold, Sora_700Bold } from '@expo-google-fonts/sora';
import { useLayoutEffect } from 'react';
import { Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ConsentGate } from '@/ui/ConsentGate';
import { ConfirmProvider } from '@/ui/ConfirmProvider';
import { RepositoryProvider } from '@/data/RepositoryProvider';
import { ThemeModeProvider } from '@/ui/ThemeModeProvider';
import { useTheme } from '@/ui/theme';

// ...(unstable_settings, useBlurOnNavigateWeb, AppRoot all unchanged)...

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Sora_600SemiBold,
    Sora_700Bold,
    Inter_400Regular,
    Inter_600SemiBold,
  });

  // Fall through to the OS-fallback font rather than hang on a blank screen
  // forever if font loading ever genuinely errors (a corrupted bundled asset).
  if (!fontsLoaded && !fontError) return null;

  return (
    <ThemeModeProvider>
      <AppRoot />
    </ThemeModeProvider>
  );
}
```

- [ ] **Step 7: Run the full suite to confirm no regressions**

Run: `npx jest`
Expected: PASS — no existing test renders the real `app/_layout.tsx` default export (`deep-link-back.test.tsx` only reads its `unstable_settings`; all route tests use `__tests__/helpers/renderRoute.tsx`'s own minimal test layout), so `useFonts` is never invoked under Jest and this gate can't hang a test.

- [ ] **Step 8: Commit**

```bash
git add package.json package-lock.json src/ui/theme.ts src/ui/theme.test.tsx app/_layout.tsx
git commit -m "Load Sora + Inter and wire the type scale to real font files"
```

---

### Task 5: `ListRow`

**Files:**
- Create: `src/ui/ListRow.tsx`
- Create: `src/ui/ListRow.test.tsx`

**Interfaces:**
- Consumes: `spacing`, `useTheme` (`src/ui/theme.ts`).
- Produces: `export function ListRow({ children, onPress, testID, isLast, style }: { children: React.ReactNode; onPress?: () => void; testID?: string; isLast?: boolean; style?: ViewStyle }): JSX.Element`.

- [ ] **Step 1: Write the failing tests**

```tsx
// src/ui/ListRow.test.tsx
import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import { ListRow } from './ListRow';
import { lightTheme } from './theme';

describe('ListRow', () => {
  it('renders its children', async () => {
    await render(
      <ListRow testID="row-1">
        <Text>Cloud Basics</Text>
      </ListRow>,
    );
    expect(screen.getByText('Cloud Basics')).toBeTruthy();
  });

  it('shows a bottom hairline by default', async () => {
    await render(
      <ListRow testID="row-1">
        <Text>Cloud Basics</Text>
      </ListRow>,
    );
    expect(screen.getByTestId('row-1').props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ borderBottomWidth: 1, borderBottomColor: lightTheme.border }),
      ]),
    );
  });

  it('omits the hairline on the last row', async () => {
    await render(
      <ListRow testID="row-1" isLast>
        <Text>Cloud Basics</Text>
      </ListRow>,
    );
    expect(screen.getByTestId('row-1').props.style).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ borderBottomWidth: 1 })]),
    );
  });

  it('never applies a shadow (that is the outer Card wrapper\'s job)', async () => {
    await render(
      <ListRow testID="row-1">
        <Text>Cloud Basics</Text>
      </ListRow>,
    );
    const flat = [screen.getByTestId('row-1').props.style].flat();
    expect(flat.some((s) => s && typeof s === 'object' && 'boxShadow' in s)).toBe(false);
  });

  it('calls onPress when pressed', async () => {
    const onPress = jest.fn();
    await render(
      <ListRow testID="row-1" onPress={onPress}>
        <Text>Cloud Basics</Text>
      </ListRow>,
    );
    await fireEvent.press(screen.getByTestId('row-1'));
    expect(onPress).toHaveBeenCalled();
  });

  it('renders as a plain (non-pressable) view when there is no onPress', async () => {
    await render(
      <ListRow testID="row-1">
        <Text>Cloud Basics</Text>
      </ListRow>,
    );
    expect(screen.getByTestId('row-1').props.accessibilityRole).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx jest src/ui/ListRow.test.tsx`
Expected: FAIL — `Cannot find module './ListRow'`.

- [ ] **Step 3: Write the implementation**

```tsx
// src/ui/ListRow.tsx
import { Pressable, View, type ViewStyle } from 'react-native';
import { spacing, useTheme } from './theme';

export function ListRow({
  children,
  onPress,
  testID,
  isLast = false,
  style,
}: {
  children: React.ReactNode;
  onPress?: () => void;
  testID?: string;
  isLast?: boolean;
  style?: ViewStyle;
}) {
  const theme = useTheme();
  const base = [
    { padding: spacing.md, gap: spacing.xs },
    !isLast ? { borderBottomWidth: 1, borderBottomColor: theme.border } : null,
    style,
  ];

  if (!onPress) {
    return (
      <View testID={testID} style={base}>
        {children}
      </View>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      testID={testID}
      onPress={onPress}
      style={({ pressed }) => [...base, { opacity: pressed ? 0.9 : 1 }]}
    >
      {children}
    </Pressable>
  );
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx jest src/ui/ListRow.test.tsx`
Expected: PASS (6 tests)

- [ ] **Step 5: Commit**

```bash
git add src/ui/ListRow.tsx src/ui/ListRow.test.tsx
git commit -m "Add ListRow: a flat, hairline-separated row for grouped lists"
```

---

### Task 6: Fix "everything's a card" in `LibraryView` and `HistoryView`

**Files:**
- Modify: `src/ui/LibraryView.tsx`
- Modify: `src/ui/HistoryView.tsx`

**Interfaces:**
- Consumes: `ListRow` (Task 5).
- Produces: no prop/signature change to either view. Every existing `testID` (`set-card-${set.id}`, `history-${item.id}`) is preserved exactly, so `LibraryView.test.tsx`, `HistoryView.test.tsx`, `__tests__/app/library.test.tsx`, and `__tests__/app/history.test.tsx` all keep passing unmodified.

- [ ] **Step 1: Confirm the existing tests currently pass (baseline)**

Run: `npx jest src/ui/LibraryView.test.tsx src/ui/HistoryView.test.tsx __tests__/app/library.test.tsx __tests__/app/history.test.tsx`
Expected: PASS (this is the baseline — these tests check `testID`, visible text, and press behavior, none of which this task changes; there is no new behavior here to pin with a new test beyond what `ListRow.test.tsx` in Task 5 already covers)

- [ ] **Step 2: Rewrite the sets list in `LibraryView.tsx`**

Add `ListRow` to the imports and replace the `sets.map(...)` block:

```ts
import { Button } from './Button';
import { Card } from './Card';
import { ListRow } from './ListRow';
import { formatDate, formatPercent } from './format';
import { Screen } from './Screen';
import { spacing, type, useTheme } from './theme';
```

```tsx
      ) : (
        <Card>
          {sets.map((set, index) => (
            <ListRow
              key={set.id}
              testID={`set-card-${set.id}`}
              onPress={() => onOpenSet(set.id)}
              isLast={index === sets.length - 1}
            >
              <Text style={[type.heading, { color: theme.text }]}>{set.title}</Text>
              {set.description ? (
                <Text style={[type.caption, { color: theme.textMuted }]} numberOfLines={2}>
                  {set.description}
                </Text>
              ) : null}
              <Text style={[type.caption, { color: theme.textMuted }]}>
                {`${set.questionCount} questions · ${set.topicCount} topics`}
              </Text>
              {set.attemptCount > 0 && set.bestPercent !== null ? (
                <Text style={[type.caption, { color: theme.textMuted }]}>
                  {`Best ${formatPercent(set.bestPercent)} · last ${formatDate(set.lastAttemptAt ?? '')}`}
                </Text>
              ) : null}
            </ListRow>
          ))}
        </Card>
      )}
```

(This replaces the previous `sets.map((set) => (<Card key={set.id} ...>...</Card>))` block; the `loading`/empty-state branches above it are unchanged.)

- [ ] **Step 3: Rewrite the attempts list in `HistoryView.tsx`**

Add `ListRow` to the imports and replace the `attempts.map(...)` block:

```ts
import { Card } from './Card';
import { ListRow } from './ListRow';
import { formatDate, formatPercent } from './format';
import { Screen } from './Screen';
import { spacing, type, useTheme } from './theme';
```

```tsx
      ) : (
        <Card>
          {attempts.map((item, index) => (
            <ListRow
              key={item.id}
              testID={`history-${item.id}`}
              onPress={() => onOpenAttempt(item.id)}
              isLast={index === attempts.length - 1}
            >
              <Text style={[type.heading, { color: theme.text }]}>
                {setTitles[item.setId] ?? item.setId}
              </Text>
              <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                <Text style={[type.caption, { color: theme.textMuted, flex: 1 }]}>
                  {`${item.mode === 'mock' ? 'Mock test' : 'Practice'} · ${formatDate(item.finishedAt)}`}
                </Text>
                <Text
                  style={[
                    type.label,
                    { color: item.mode === 'mock' && !item.score.passed ? theme.negative : theme.text },
                  ]}
                >
                  {formatPercent(item.score.percent)}
                </Text>
              </View>
            </ListRow>
          ))}
        </Card>
      )}
```

- [ ] **Step 4: Run the same tests again to confirm they still pass unmodified**

Run: `npx jest src/ui/LibraryView.test.tsx src/ui/HistoryView.test.tsx __tests__/app/library.test.tsx __tests__/app/history.test.tsx`
Expected: PASS — identical to the Step 1 baseline

Run: `npx jest`
Expected: PASS (no regressions)

- [ ] **Step 5: Commit**

```bash
git add src/ui/LibraryView.tsx src/ui/HistoryView.tsx
git commit -m "LibraryView, HistoryView: group list rows in one Card instead of shadowing each item"
```

---

### Task 7: Literal-value audit

**Files:** none (verification only — no code changes expected; this task's job is to confirm that, or fix any straggler it finds).

- [ ] **Step 1: Re-run the hex/typography literal audit**

Run:
```bash
grep -rn "#[0-9a-fA-F]\{3,8\}" src/ui app --include="*.tsx" --include="*.ts" | grep -v "\.test\.tsx" | grep -v "src/ui/theme.ts"
grep -rn "fontSize:\|fontWeight:" src/ui app --include="*.tsx" --include="*.ts" | grep -v "\.test\.tsx" | grep -v "src/ui/theme.ts"
```
Expected: no output from either command (this was already verified once during spec-writing on the pre-Phase-2 codebase; re-run it now against the actual Phase 2 changes from Tasks 1–6, since new code was just added). If either command finds something, add a token to `theme.ts` and fix the site before moving on — do not leave a found straggler unfixed.

- [ ] **Step 2: Broaden the `accent` grep past the 4 already-known Task 3 sites**

Run:
```bash
grep -rn "\.accent\b" src/ui app --include="*.tsx" --include="*.ts" | grep -v "\.test\.tsx"
```
Expected: only `Button.tsx` (primary variant), `Feedback.tsx` (reference link), and `ProgressBar.tsx` (neutral tone) remain — the three sites the spec explicitly kept on `accent`. If anything else turns up (e.g. a differently-bound local variable that still reads `theme.accent` for a "selected" concept), decide with the same rubric as Task 3 (§4 of the spec: is this "selection", or "structural/primary"?) and fix it.

- [ ] **Step 3: Commit only if Step 1 or Step 2 found something to fix**

```bash
git add -A
git commit -m "Fix a literal/accent straggler found by the Phase 2 audit"
```

If nothing was found, there is nothing to commit — this task's outcome is the verification itself, not a code change.

---

### Task 8: Manual browser verification

**Files:** none (verification only — no code changes).

- [ ] **Step 1: Start the dev server and open it in the real browser**

Per `[[practice_test_workspace_layout]]`: start Expo with `CI=1` set (no file watcher needed for a one-off check), serving at `http://localhost:8081/`. Drive it with `puppeteer-core` against `/usr/bin/google-chrome-stable` from the session scratchpad.

- [ ] **Step 2: Confirm the palette and elevation, in both light and dark mode**

- Library and History: the sets/attempts lists render as one grouped, shadowed card with flat hairline-separated rows inside — not a stack of individually-shadowed cards.
- Any singular container (results score panel, resume banner, set-detail header) still reads as an elevated card.
- Take a multiple-choice question: tap an option before revealing — the selected border is the new amber `highlight`, clearly distinguishable from the neutral `border` gray, in both light and dark mode. Reveal the answer — correct/incorrect green/red are unchanged from before.
- The question-grid "current question" cell border is amber, not the old blue.
- Primary buttons (e.g. "Continue"/"Resume"/"Done") are navy, not amber and not the old blue.

- [ ] **Step 3: Confirm the fonts actually loaded**

- Inspect a heading (e.g. "Question sets", a score percentage) and confirm it visually matches Sora's geometric character (compare against the font-pairing mockup from brainstorming), not the browser's default system sans-serif.
- Reload the page 2–3 times to confirm the fonts consistently load with no flash-of-blank/fallback-then-swap that looks broken, and that the app never hangs on a blank screen.

- [ ] **Step 4: Report findings**

If everything above holds, note it in the memory update for this feature. If the amber/navy split reads wrong anywhere, or a `ListRow` hairline is missing/duplicated with real (not test-fixture) content, fix it before treating Phase 2 as done — this mirrors the project's established practice of never calling a UI change complete on test-suite results alone.
