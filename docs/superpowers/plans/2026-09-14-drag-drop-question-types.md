# Drag-and-Drop Ordering & Matching Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the up/down-button ordering UI and tap-to-pair matching UI with real drag-and-drop interactions, using the gesture/animation libraries already in the project.

**Architecture:** Both `OrderingInput` and `MatchingInput` are rewritten to use `react-native-gesture-handler`'s `Gesture.Pan()` plus `react-native-reanimated` shared values for drag tracking, with no new dependencies. Ordering becomes a live-reordering list: dragging a row swaps it past neighbors in place, backed by a pure `reorder()` function. Matching becomes two columns — fixed left slots and a shrinking right-hand answer bank — where dragging an answer chip onto a slot (or back out of one) is resolved via pure `setPair()`/`clearPair()`/`findSlotAt()` functions and plain `View.measure()` layout tracking (works identically on native and react-native-web, no `useAnimatedRef`/dynamic-hook-count concerns). The public props of both components (`onChange` shape, `question`/`response`/`revealed`/`initialOrder`) are unchanged, so `QuestionCard.tsx`, scoring, and session code need no changes.

**Tech Stack:** `react-native-gesture-handler` (already a dependency), `react-native-reanimated` (already a dependency), Jest + `@testing-library/react-native` for tests.

**Spec:** No separate spec doc — this is a bounded task per `superpowers:brainstorming` (both flows already exist in the repo). The full design was agreed in conversation on 2026-09-14; the Architecture section above and the Global Constraints below are the complete, binding design.

## Global Constraints

- Web (react-native-web, mouse drag) is the primary QA target — it's the only build the user actually runs. Native touch drag should work via the same gesture-handler code but is not separately QA'd in this plan.
- Drag-only interaction — no tap/keyboard fallback path is being added in this iteration.
- No new dependencies. Use only `react-native-gesture-handler` and `react-native-reanimated`, both already installed.
- Do not change the public prop signatures of `OrderingInput` or `MatchingInput`, or the `onChange` payload shapes (`string[]` order / `"left:right"` pair strings) — downstream code (`QuestionCard.tsx`, `src/core/scoring.ts`, `src/core/session.ts`) depends on these and must not need edits.
- Ordering rows use a single line of text (`numberOfLines={1}`) instead of wrapping — a deliberate simplification so row height stays fixed and drag math stays simple.
- Push to origin after every commit (every task ends with a push, not just the last one).
- Work happens on an isolated git worktree/branch (already set up before Task 1 — see the Setup Note below), merged via `superpowers:finishing-a-development-branch` after Task 6.

## Setup Note (ruling, recorded before Task 1)

This plan's isolated workspace was already created via the native `EnterWorktree` tool before any task was dispatched — it produced branch `worktree-drag-drop-question-types` (not the `feature/drag-drop-question-types` name originally drafted). Task 1's Step 1 ("create the feature branch") is therefore already satisfied and must be **skipped**; do not create or switch to another branch. `jest.config.js`'s `testPathIgnorePatterns` was also already fixed pre-Task-1 (see commit "Anchor worktree-exclusion pattern to `<rootDir>`...") because the original pattern (`'/.claude/worktrees/'` as a bare substring) excluded every file in this worktree from its own test run. Task 1's Step 3 code block below reflects that fix already — implement it as written.

---

### Task 1: Enable gesture-handler at the app root + in Jest

**Files:**
- Modify: `app/_layout.tsx`
- Modify: `jest.config.js`

**Interfaces:**
- Consumes: nothing new.
- Produces: `GestureHandlerRootView` wraps the whole app, which every later task's `GestureDetector` usage requires to function (on native, gesture-handler silently no-ops without it). Jest is configured to load gesture-handler's native mocks so component tests that render `GestureDetector`-wrapped components don't crash.

- [ ] **Step 1: (Skipped — see Setup Note above. The worktree/branch already exists.)**

- [ ] **Step 2: Wrap the app root in `GestureHandlerRootView`**

Replace the full contents of `app/_layout.tsx` with:

```tsx
import { Stack, usePathname } from 'expo-router';
import { useLayoutEffect } from 'react';
import { Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ConsentGate } from '@/ui/ConsentGate';
import { ConfirmProvider } from '@/ui/ConfirmProvider';
import { RepositoryProvider } from '@/data/RepositoryProvider';
import { useTheme } from '@/ui/theme';

// react-navigation's web renderer marks the outgoing screen aria-hidden as
// soon as a route changes, but never blurs whatever element still has DOM
// focus inside it (e.g. the button that was pressed to trigger the
// navigation) - Chrome then warns "Blocked aria-hidden on an element
// because its descendant retained focus". Do the blur ourselves.
function useBlurOnNavigateWeb() {
  const pathname = usePathname();
  useLayoutEffect(() => {
    if (Platform.OS !== 'web') return;
    (document.activeElement as HTMLElement | null)?.blur?.();
  }, [pathname]);
}

export default function RootLayout() {
  useBlurOnNavigateWeb();
  const theme = useTheme();
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <RepositoryProvider>
        <ConfirmProvider>
          <ConsentGate>
            <Stack
              screenOptions={{
                headerStyle: { backgroundColor: theme.surface },
                headerTintColor: theme.text,
                headerShadowVisible: false,
                contentStyle: { backgroundColor: theme.background },
              }}
            >
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen name="set/[setId]" options={{ title: 'Set' }} />
              <Stack.Screen name="session/[attemptId]" options={{ title: 'Session', headerBackVisible: false }} />
              <Stack.Screen name="results/[attemptId]" options={{ title: 'Results' }} />
              <Stack.Screen name="import" options={{ title: 'Import a set', presentation: 'modal' }} />
              <Stack.Screen name="builder/new" options={{ title: 'Create a set', presentation: 'modal' }} />
              <Stack.Screen name="builder/[setId]" options={{ title: 'Edit set' }} />
            </Stack>
          </ConsentGate>
        </ConfirmProvider>
      </RepositoryProvider>
    </GestureHandlerRootView>
  );
}
```

- [ ] **Step 3: Add gesture-handler's Jest setup**

Replace the full contents of `jest.config.js` with:

```js
module.exports = {
  preset: 'jest-expo',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '@react-native-async-storage/async-storage': '@react-native-async-storage/async-storage/jest/async-storage-mock',
  },
  setupFiles: ['react-native-gesture-handler/jestSetup'],
  testMatch: ['**/*.test.ts', '**/*.test.tsx'],
  testPathIgnorePatterns: ['/node_modules/', '<rootDir>/.claude/worktrees/'],
  collectCoverageFrom: ['src/**/*.{ts,tsx}'],
};
```

- [ ] **Step 4: Run the full test suite to confirm nothing broke**

Run: `npm test`
Expected: PASS, same test count as before this change (this step only adds infrastructure, no behavior changed yet).

- [ ] **Step 5: Commit and push**

```bash
git add app/_layout.tsx jest.config.js
git commit -m "Wire up react-native-gesture-handler at the app root and in Jest"
git push
```

---

### Task 2: Ordering pure logic — `reorder()`

**Files:**
- Create: `src/core/ordering.ts`
- Test: `src/core/ordering.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `reorder(order: string[], fromIndex: number, toIndex: number): string[]` — pure, immutable, marked `'worklet'` so it can run on the UI thread from a gesture callback in Task 3. Out-of-range indices are a no-op.

- [ ] **Step 1: Write the failing tests**

Create `src/core/ordering.test.ts`:

```ts
import { describe, expect, it } from '@jest/globals';
import { reorder } from './ordering';

describe('reorder', () => {
  it('moves an item forward in the list', () => {
    expect(reorder(['a', 'b', 'c', 'd'], 0, 2)).toEqual(['b', 'c', 'a', 'd']);
  });

  it('moves an item backward in the list', () => {
    expect(reorder(['a', 'b', 'c', 'd'], 3, 1)).toEqual(['a', 'd', 'b', 'c']);
  });

  it('is a no-op when the index does not change', () => {
    const order = ['a', 'b', 'c'];
    expect(reorder(order, 1, 1)).toEqual(order);
  });

  it('is a no-op when the target index is out of range', () => {
    const order = ['a', 'b', 'c'];
    expect(reorder(order, 0, 5)).toEqual(order);
    expect(reorder(order, 0, -1)).toEqual(order);
  });

  it('does not mutate the input array', () => {
    const order = ['a', 'b', 'c'];
    reorder(order, 0, 2);
    expect(order).toEqual(['a', 'b', 'c']);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx jest src/core/ordering.test.ts`
Expected: FAIL with "Cannot find module './ordering'"

- [ ] **Step 3: Implement `reorder()`**

Create `src/core/ordering.ts`:

```ts
export function reorder(order: string[], fromIndex: number, toIndex: number): string[] {
  'worklet';
  if (
    fromIndex === toIndex ||
    fromIndex < 0 ||
    fromIndex >= order.length ||
    toIndex < 0 ||
    toIndex >= order.length
  ) {
    return order;
  }
  const next = [...order];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx jest src/core/ordering.test.ts`
Expected: PASS

- [ ] **Step 5: Commit and push**

```bash
git add src/core/ordering.ts src/core/ordering.test.ts
git commit -m "Add pure reorder() for the ordering drag list"
git push
```

---

### Task 3: Rewrite `OrderingInput` as a drag-to-reorder list

**Files:**
- Modify: `src/ui/OrderingInput.tsx`
- Modify: `src/ui/OrderingInput.test.tsx`

**Interfaces:**
- Consumes: `reorder` from `src/core/ordering.ts` (Task 2).
- Produces: `OrderingInput` keeps its existing prop signature — `{ question: OrderingQuestion; response: string[]; revealed: boolean; initialOrder: string[]; onChange: (order: string[]) => void }` — so `QuestionCard.tsx` needs no changes.

- [ ] **Step 1: Update the test file first**

Replace the full contents of `src/ui/OrderingInput.test.tsx` with:

```tsx
import { describe, expect, it, jest } from '@jest/globals';
import { render, screen } from '@testing-library/react-native';
import type { OrderingQuestion } from '@/core/schema';
import { OrderingInput } from './OrderingInput';

const question: OrderingQuestion = {
  id: 'q-ord',
  type: 'ordering',
  prompt: 'Order these',
  items: [
    { id: 'i1', text: 'Plan' },
    { id: 'i2', text: 'Build' },
    { id: 'i3', text: 'Ship' },
  ],
  correctOrder: ['i1', 'i2', 'i3'],
};

describe('OrderingInput', () => {
  it('starts from the presented order when there is no response yet', async () => {
    await render(
      <OrderingInput
        question={question}
        response={[]}
        revealed={false}
        initialOrder={['i3', 'i1', 'i2']}
        onChange={() => {}}
      />,
    );
    const rows = screen.getAllByTestId(/^order-row-/).map((n) => n.props.testID);
    expect(rows).toEqual(['order-row-i3', 'order-row-i1', 'order-row-i2']);
  });

  it('renders the response order once the user has moved something', async () => {
    await render(
      <OrderingInput
        question={question}
        response={['i2', 'i1', 'i3']}
        revealed={false}
        initialOrder={['i3', 'i1', 'i2']}
        onChange={() => {}}
      />,
    );
    const rows = screen.getAllByTestId(/^order-row-/).map((n) => n.props.testID);
    expect(rows).toEqual(['order-row-i2', 'order-row-i1', 'order-row-i3']);
  });

  it('reports the presented order as the answer before the user touches anything', async () => {
    const onChange = jest.fn();
    await render(
      <OrderingInput
        question={question}
        response={[]}
        revealed={false}
        initialOrder={['i3', 'i1', 'i2']}
        onChange={onChange}
      />,
    );
    expect(onChange).toHaveBeenCalledWith(['i3', 'i1', 'i2']);
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('does not overwrite an answer that is already there', async () => {
    const onChange = jest.fn();
    await render(
      <OrderingInput
        question={question}
        response={['i2', 'i1', 'i3']}
        revealed={false}
        initialOrder={['i3', 'i1', 'i2']}
        onChange={onChange}
      />,
    );
    expect(onChange).not.toHaveBeenCalled();
  });

  it('reports nothing once the question is revealed', async () => {
    const onChange = jest.fn();
    await render(
      <OrderingInput
        question={question}
        response={[]}
        revealed
        initialOrder={['i3', 'i1', 'i2']}
        onChange={onChange}
      />,
    );
    expect(onChange).not.toHaveBeenCalled();
  });

  it('reports the presented order again when it is shown a different question', async () => {
    const onChange = jest.fn();
    const view = await render(
      <OrderingInput
        question={question}
        response={[]}
        revealed={false}
        initialOrder={['i3', 'i1', 'i2']}
        onChange={onChange}
      />,
    );
    const next = { ...question, id: 'q-ord-2' };
    await view.rerender(
      <OrderingInput
        question={next}
        response={[]}
        revealed={false}
        initialOrder={['i2', 'i3', 'i1']}
        onChange={onChange}
      />,
    );
    expect(onChange).toHaveBeenNthCalledWith(1, ['i3', 'i1', 'i2']);
    expect(onChange).toHaveBeenNthCalledWith(2, ['i2', 'i3', 'i1']);
  });

  it('grades no row when a revealed question was never answered', async () => {
    await render(
      <OrderingInput
        question={question}
        response={[]}
        revealed
        initialOrder={['i1', 'i2', 'i3']}
        onChange={() => {}}
      />,
    );
    const labels = screen
      .getAllByTestId(/^order-row-/)
      .map((node) => node.props.accessibilityLabel as string);
    expect(labels.some((label) => label.includes('correct position'))).toBe(false);
    expect(labels.some((label) => label.includes('wrong position'))).toBe(false);
    expect(labels.every((label) => label.includes('not answered'))).toBe(true);
  });

  it('disables dragging and marks correct positions once revealed', async () => {
    await render(
      <OrderingInput
        question={question}
        response={['i2', 'i1', 'i3']}
        revealed
        initialOrder={['i1', 'i2', 'i3']}
        onChange={() => {}}
      />,
    );
    expect(screen.getByTestId('order-row-i3').props.accessibilityState.disabled).toBe(true);
    expect(screen.getByTestId('order-row-i3').props.accessibilityLabel).toContain('correct position');
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx jest src/ui/OrderingInput.test.tsx`
Expected: FAIL — the last test (`accessibilityState.disabled`) doesn't exist yet on the current button-based rows, and the removed move-button tests are gone from this file so there's nothing to conflict, but the row markup hasn't changed yet so the disabled-state assertion fails.

- [ ] **Step 3: Rewrite the component**

Replace the full contents of `src/ui/OrderingInput.tsx` with:

```tsx
import { useEffect, useRef } from 'react';
import { Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  type SharedValue,
} from 'react-native-reanimated';
import type { OrderingQuestion } from '@/core/schema';
import { reorder } from '@/core/ordering';
import { radius, spacing, type, useTheme } from './theme';

const ROW_HEIGHT = 56;

function clamp(value: number, min: number, max: number) {
  'worklet';
  return Math.min(Math.max(value, min), max);
}

export function OrderingInput({
  question,
  response,
  revealed,
  initialOrder,
  onChange,
}: {
  question: OrderingQuestion;
  response: string[];
  revealed: boolean;
  initialOrder: string[];
  onChange: (order: string[]) => void;
}) {
  const theme = useTheme();
  const itemText = new Map(question.items.map((item) => [item.id, item.text]));
  const order = response.length === question.items.length ? response : initialOrder;
  // Nothing was submitted for this question - review must not grade the rows.
  const unanswered = revealed && response.length === 0;
  const graded = revealed && !unanswered;

  // The presented order is itself an assertion: a user who agrees with it must be able to
  // submit without perturbing it first. Report it once per question so "did not touch
  // anything" means "the shown order is my answer", the way a real ordering item works.
  const seededFor = useRef<string | null>(null);
  useEffect(() => {
    if (revealed) return;
    if (seededFor.current === question.id) return;
    // Never overwrite an answer that is already there (resume, or a prior visit).
    if (response.length > 0) return;
    seededFor.current = question.id;
    onChange(initialOrder);
  }, [question.id, revealed, response.length, initialOrder, onChange]);

  // The live drag order lives on a shared value so dragging one row can reorder the rest on
  // the UI thread every frame without a React re-render. `onChange` only hears about the
  // result once a drag ends.
  const orderRef = useSharedValue<string[]>(order);
  const orderKey = order.join('|');
  useEffect(() => {
    orderRef.value = order;
  }, [orderKey]);

  return (
    <View style={{ height: order.length * ROW_HEIGHT, marginTop: spacing.sm }}>
      {order.map((itemId, index) => {
        const rightPlace = graded && question.correctOrder[index] === itemId;
        const label = [
          `${index + 1}. ${itemText.get(itemId) ?? itemId}`,
          unanswered ? 'not answered' : null,
          graded ? (rightPlace ? 'correct position' : 'wrong position') : null,
        ]
          .filter(Boolean)
          .join(', ');

        return (
          <Row
            key={itemId}
            id={itemId}
            index={index}
            text={itemText.get(itemId) ?? itemId}
            label={label}
            disabled={revealed}
            orderRef={orderRef}
            onChange={onChange}
            borderColor={graded ? (rightPlace ? theme.positive : theme.negative) : theme.border}
            backgroundColor={
              graded ? (rightPlace ? theme.positiveSurface : theme.negativeSurface) : theme.surface
            }
          />
        );
      })}
    </View>
  );
}

function Row({
  id,
  index,
  text,
  label,
  disabled,
  orderRef,
  onChange,
  borderColor,
  backgroundColor,
}: {
  id: string;
  index: number;
  text: string;
  label: string;
  disabled: boolean;
  orderRef: SharedValue<string[]>;
  onChange: (order: string[]) => void;
  borderColor: string;
  backgroundColor: string;
}) {
  const theme = useTheme();
  const translateY = useSharedValue(index * ROW_HEIGHT);
  const isDragging = useSharedValue(false);
  const startY = useSharedValue(0);

  useAnimatedReaction(
    () => orderRef.value.indexOf(id),
    (current, previous) => {
      if (current !== previous && !isDragging.value) {
        translateY.value = withSpring(current * ROW_HEIGHT);
      }
    },
  );

  const pan = Gesture.Pan()
    .enabled(!disabled)
    .onStart(() => {
      isDragging.value = true;
      startY.value = translateY.value;
    })
    .onUpdate((event) => {
      translateY.value = startY.value + event.translationY;
      const currentIndex = orderRef.value.indexOf(id);
      const targetIndex = clamp(
        Math.round(translateY.value / ROW_HEIGHT),
        0,
        orderRef.value.length - 1,
      );
      if (targetIndex !== currentIndex) {
        orderRef.value = reorder(orderRef.value, currentIndex, targetIndex);
      }
    })
    .onEnd(() => {
      isDragging.value = false;
      const finalIndex = orderRef.value.indexOf(id);
      translateY.value = withSpring(finalIndex * ROW_HEIGHT);
      runOnJS(onChange)(orderRef.value);
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }, { scale: isDragging.value ? 1.03 : 1 }],
    zIndex: isDragging.value ? 1 : 0,
    shadowOpacity: isDragging.value ? 0.2 : 0,
    shadowRadius: 8,
    elevation: isDragging.value ? 4 : 0,
  }));

  return (
    <GestureDetector gesture={pan}>
      <Animated.View
        testID={`order-row-${id}`}
        accessibilityLabel={label}
        accessibilityState={{ disabled }}
        style={[
          {
            position: 'absolute',
            left: 0,
            right: 0,
            height: ROW_HEIGHT - spacing.sm,
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.sm,
            paddingHorizontal: spacing.md,
            borderRadius: radius.md,
            borderWidth: 1,
            borderColor,
            backgroundColor,
          },
          animatedStyle,
        ]}
      >
        <Text style={[type.label, { color: theme.textMuted }]}>{index + 1}</Text>
        <Text numberOfLines={1} style={[type.body, { color: theme.text, flex: 1 }]}>
          {text}
        </Text>
      </Animated.View>
    </GestureDetector>
  );
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx jest src/ui/OrderingInput.test.tsx`
Expected: PASS

- [ ] **Step 5: Typecheck**

Run: `npm run typecheck`
Expected: no errors

- [ ] **Step 6: Commit and push**

```bash
git add src/ui/OrderingInput.tsx src/ui/OrderingInput.test.tsx
git commit -m "Replace ordering move-buttons with drag-to-reorder"
git push
```

---

### Task 4: Matching pure logic — `parsePairs`/`serialisePairs`/`setPair`/`clearPair`/`findSlotAt`

**Files:**
- Create: `src/core/matching.ts`
- Test: `src/core/matching.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `parsePairs(response: string[]): Map<string, string>`
  - `serialisePairs(pairs: Map<string, string>): string[]`
  - `setPair(pairs: Map<string, string>, leftId: string, rightId: string): Map<string, string>` — assigns `rightId` to `leftId`; if `rightId` was already assigned to a different left, that old pairing is dropped first.
  - `clearPair(pairs: Map<string, string>, leftId: string): Map<string, string>`
  - `type Rect = { pageX: number; pageY: number; width: number; height: number }`
  - `findSlotAt(layout: Record<string, Rect>, x: number, y: number): string | null` — pure hit-test, marked `'worklet'` so it can run inside a gesture callback in Task 5.

- [ ] **Step 1: Write the failing tests**

Create `src/core/matching.test.ts`:

```ts
import { describe, expect, it } from '@jest/globals';
import { clearPair, findSlotAt, parsePairs, serialisePairs, setPair } from './matching';

describe('parsePairs / serialisePairs', () => {
  it('round-trips left:right entries', () => {
    const pairs = parsePairs(['l1:r1', 'l2:r2']);
    expect(pairs.get('l1')).toBe('r1');
    expect(serialisePairs(pairs).sort()).toEqual(['l1:r1', 'l2:r2']);
  });

  it('ignores malformed entries', () => {
    expect(parsePairs(['not-a-pair', 'l1:r1']).size).toBe(1);
  });
});

describe('setPair', () => {
  it('assigns a right item to an empty slot', () => {
    const pairs = setPair(new Map(), 'l1', 'r1');
    expect(pairs.get('l1')).toBe('r1');
  });

  it('replaces whatever was already in the slot', () => {
    const pairs = setPair(new Map([['l1', 'r1']]), 'l1', 'r2');
    expect(pairs.get('l1')).toBe('r2');
  });

  it('moves a right item out of its previous slot when placed in a new one', () => {
    const pairs = setPair(new Map([['l1', 'r1']]), 'l2', 'r1');
    expect(pairs.has('l1')).toBe(false);
    expect(pairs.get('l2')).toBe('r1');
  });

  it('does not mutate the input map', () => {
    const original = new Map([['l1', 'r1']]);
    setPair(original, 'l2', 'r2');
    expect(original.size).toBe(1);
  });
});

describe('clearPair', () => {
  it('removes the pairing for a left item', () => {
    const pairs = clearPair(new Map([['l1', 'r1']]), 'l1');
    expect(pairs.has('l1')).toBe(false);
  });

  it('is a no-op when the left item has no pairing', () => {
    const pairs = clearPair(new Map(), 'l1');
    expect(pairs.size).toBe(0);
  });
});

describe('findSlotAt', () => {
  const layout = {
    l1: { pageX: 0, pageY: 0, width: 100, height: 50 },
    l2: { pageX: 0, pageY: 50, width: 100, height: 50 },
  };

  it('finds the slot containing the point', () => {
    expect(findSlotAt(layout, 10, 60)).toBe('l2');
  });

  it('returns null when no slot contains the point', () => {
    expect(findSlotAt(layout, 500, 500)).toBeNull();
  });

  it('treats the box edges as inclusive', () => {
    expect(findSlotAt(layout, 100, 50)).toBe('l1');
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx jest src/core/matching.test.ts`
Expected: FAIL with "Cannot find module './matching'"

- [ ] **Step 3: Implement the module**

Create `src/core/matching.ts`:

```ts
export const parsePairs = (response: string[]): Map<string, string> =>
  new Map(
    response
      .map((entry) => entry.split(':'))
      .filter((parts): parts is [string, string] => parts.length === 2)
      .map(([left, right]) => [left, right] as const),
  );

export const serialisePairs = (pairs: Map<string, string>): string[] =>
  [...pairs.entries()].map(([left, right]) => `${left}:${right}`);

// A right item can only be matched to one left item at a time, so if it was already
// assigned elsewhere that pair is dropped first - this is what makes moving a placed chip
// straight to a different slot behave like a single move instead of leaving a duplicate.
export function setPair(
  pairs: Map<string, string>,
  leftId: string,
  rightId: string,
): Map<string, string> {
  const next = new Map(pairs);
  for (const [existingLeft, existingRight] of next) {
    if (existingRight === rightId) next.delete(existingLeft);
  }
  next.set(leftId, rightId);
  return next;
}

export function clearPair(pairs: Map<string, string>, leftId: string): Map<string, string> {
  const next = new Map(pairs);
  next.delete(leftId);
  return next;
}

export type Rect = { pageX: number; pageY: number; width: number; height: number };

export function findSlotAt(layout: Record<string, Rect>, x: number, y: number): string | null {
  'worklet';
  for (const id in layout) {
    const box = layout[id];
    if (x >= box.pageX && x <= box.pageX + box.width && y >= box.pageY && y <= box.pageY + box.height) {
      return id;
    }
  }
  return null;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx jest src/core/matching.test.ts`
Expected: PASS

- [ ] **Step 5: Commit and push**

```bash
git add src/core/matching.ts src/core/matching.test.ts
git commit -m "Add pure pairing/hit-test helpers for the matching drag UI"
git push
```

---

### Task 5: Rewrite `MatchingInput` as two columns with a draggable answer bank

**Files:**
- Modify: `src/ui/MatchingInput.tsx`
- Modify: `src/ui/MatchingInput.test.tsx`

**Interfaces:**
- Consumes: `parsePairs`, `serialisePairs`, `setPair`, `clearPair`, `findSlotAt`, `Rect` from `src/core/matching.ts` (Task 4).
- Produces: `MatchingInput` keeps its existing prop signature — `{ question: MatchingQuestion; response: string[]; revealed: boolean; onChange: (pairs: string[]) => void }` — so `QuestionCard.tsx` needs no changes. New testIDs: `left-${leftId}` (slot, unchanged), `right-${rightId}` (unplaced bank chip, unchanged), `placed-${leftId}` (new — the chip currently sitting in that slot).

- [ ] **Step 1: Update the test file first**

Replace the full contents of `src/ui/MatchingInput.test.tsx` with:

```tsx
import { describe, expect, it } from '@jest/globals';
import { render, screen } from '@testing-library/react-native';
import type { MatchingQuestion } from '@/core/schema';
import { MatchingInput } from './MatchingInput';

const question: MatchingQuestion = {
  id: 'q-mat',
  type: 'matching',
  prompt: 'Match these',
  left: [
    { id: 'l1', text: 'Latency' },
    { id: 'l2', text: 'Throughput' },
  ],
  right: [
    { id: 'r1', text: 'Time for one request' },
    { id: 'r2', text: 'Requests per second' },
  ],
  pairs: [
    { left: 'l1', right: 'r1' },
    { left: 'l2', right: 'r2' },
  ],
};

describe('MatchingInput', () => {
  it('renders every left slot and every unplaced right item in the bank', async () => {
    await render(
      <MatchingInput question={question} response={[]} revealed={false} onChange={() => {}} />,
    );
    expect(screen.getByTestId('left-l1')).toBeTruthy();
    expect(screen.getByTestId('left-l2')).toBeTruthy();
    expect(screen.getByTestId('right-r1')).toBeTruthy();
    expect(screen.getByTestId('right-r2')).toBeTruthy();
  });

  it('removes a placed answer from the bank and shows it in its slot', async () => {
    await render(
      <MatchingInput question={question} response={['l1:r1']} revealed={false} onChange={() => {}} />,
    );
    expect(screen.queryByTestId('right-r1')).toBeNull();
    expect(screen.getByTestId('placed-l1')).toBeTruthy();
    expect(screen.getByTestId('left-l1').props.accessibilityLabel).toContain(
      'Time for one request',
    );
  });

  it('marks right and wrong pairs once revealed', async () => {
    await render(
      <MatchingInput question={question} response={['l1:r2', 'l2:r1']} revealed onChange={() => {}} />,
    );
    expect(screen.getByTestId('left-l1').props.accessibilityLabel).toContain('incorrect');
    expect(screen.getByTestId('left-l2').props.accessibilityLabel).toContain('incorrect');
  });

  it('disables dragging once revealed', async () => {
    await render(
      <MatchingInput question={question} response={['l1:r1']} revealed onChange={() => {}} />,
    );
    expect(screen.getByTestId('placed-l1').props.accessibilityState.disabled).toBe(true);
    expect(screen.getByTestId('left-l2').props.accessibilityState.disabled).toBe(true);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx jest src/ui/MatchingInput.test.tsx`
Expected: FAIL — `placed-l1` testID doesn't exist yet on the current tap-based component.

- [ ] **Step 3: Rewrite the component**

Replace the full contents of `src/ui/MatchingInput.tsx` with:

```tsx
import { useRef } from 'react';
import { Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  type SharedValue,
} from 'react-native-reanimated';
import type { MatchingQuestion } from '@/core/schema';
import {
  clearPair,
  findSlotAt,
  parsePairs,
  serialisePairs,
  setPair,
  type Rect,
} from '@/core/matching';
import { radius, spacing, type, useTheme } from './theme';

export function MatchingInput({
  question,
  response,
  revealed,
  onChange,
}: {
  question: MatchingQuestion;
  response: string[];
  revealed: boolean;
  onChange: (pairs: string[]) => void;
}) {
  const theme = useTheme();
  const pairs = parsePairs(response);
  const expected = parsePairs(question.pairs.map((p) => `${p.left}:${p.right}`));
  const rightText = new Map(question.right.map((item) => [item.id, item.text]));
  const placedRightIds = new Set(pairs.values());
  const bank = question.right.filter((item) => !placedRightIds.has(item.id));

  const slotLayout = useSharedValue<Record<string, Rect>>({});
  const slotNodes = useRef<Record<string, View | null>>({});

  const measureSlot = (leftId: string) => {
    slotNodes.current[leftId]?.measure((_x, _y, width, height, pageX, pageY) => {
      slotLayout.value = { ...slotLayout.value, [leftId]: { pageX, pageY, width, height } };
    });
  };

  const place = (leftId: string, rightId: string) => {
    onChange(serialisePairs(setPair(pairs, leftId, rightId)));
  };

  const returnToBank = (leftId: string) => {
    onChange(serialisePairs(clearPair(pairs, leftId)));
  };

  return (
    <View style={{ gap: spacing.lg, marginTop: spacing.sm }}>
      <View style={{ gap: spacing.sm }}>
        {question.left.map((item) => {
          const pairedRight = pairs.get(item.id);
          const correct = revealed && pairedRight === expected.get(item.id);
          const label = [
            item.text,
            pairedRight ? `paired with ${rightText.get(pairedRight) ?? pairedRight}` : 'not paired',
            revealed ? (correct ? 'correct' : 'incorrect') : null,
          ]
            .filter(Boolean)
            .join(', ');

          return (
            <View
              key={item.id}
              ref={(node) => {
                slotNodes.current[item.id] = node;
              }}
              onLayout={() => measureSlot(item.id)}
              testID={`left-${item.id}`}
              accessibilityLabel={label}
              accessibilityState={{ disabled: revealed }}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing.sm,
                padding: spacing.md,
                minHeight: 56,
                borderRadius: radius.md,
                borderWidth: revealed ? 2 : 1,
                borderColor: revealed ? (correct ? theme.positive : theme.negative) : theme.border,
                backgroundColor: revealed
                  ? correct
                    ? theme.positiveSurface
                    : theme.negativeSurface
                  : theme.surface,
              }}
            >
              <Text style={[type.body, { color: theme.text, flex: 1 }]}>{item.text}</Text>
              {pairedRight ? (
                <DraggableAnswer
                  rightId={pairedRight}
                  text={rightText.get(pairedRight) ?? pairedRight}
                  sourceLeftId={item.id}
                  disabled={revealed}
                  slotLayout={slotLayout}
                  onPlace={place}
                  onReturnToBank={returnToBank}
                />
              ) : (
                <Text style={[type.caption, { color: theme.textMuted }]}>Drop answer here</Text>
              )}
            </View>
          );
        })}
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
        {bank.map((item) => (
          <DraggableAnswer
            key={item.id}
            rightId={item.id}
            text={item.text}
            sourceLeftId={null}
            disabled={revealed}
            slotLayout={slotLayout}
            onPlace={place}
            onReturnToBank={returnToBank}
          />
        ))}
      </View>
    </View>
  );
}

function DraggableAnswer({
  rightId,
  text,
  sourceLeftId,
  disabled,
  slotLayout,
  onPlace,
  onReturnToBank,
}: {
  rightId: string;
  text: string;
  sourceLeftId: string | null;
  disabled: boolean;
  slotLayout: SharedValue<Record<string, Rect>>;
  onPlace: (leftId: string, rightId: string) => void;
  onReturnToBank: (leftId: string) => void;
}) {
  const theme = useTheme();
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const isDragging = useSharedValue(false);

  const pan = Gesture.Pan()
    .enabled(!disabled)
    .onStart(() => {
      isDragging.value = true;
    })
    .onUpdate((event) => {
      translateX.value = event.translationX;
      translateY.value = event.translationY;
    })
    .onEnd((event) => {
      isDragging.value = false;
      const hitLeftId = findSlotAt(slotLayout.value, event.absoluteX, event.absoluteY);
      translateX.value = withSpring(0);
      translateY.value = withSpring(0);
      if (hitLeftId) {
        runOnJS(onPlace)(hitLeftId, rightId);
      } else if (sourceLeftId) {
        runOnJS(onReturnToBank)(sourceLeftId);
      }
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: isDragging.value ? 1.05 : 1 },
    ],
    zIndex: isDragging.value ? 10 : 0,
    shadowOpacity: isDragging.value ? 0.25 : 0,
    shadowRadius: 8,
    elevation: isDragging.value ? 6 : 0,
  }));

  return (
    <GestureDetector gesture={pan}>
      <Animated.View
        testID={sourceLeftId ? `placed-${sourceLeftId}` : `right-${rightId}`}
        accessibilityLabel={text}
        accessibilityState={{ disabled }}
        style={[
          {
            paddingVertical: spacing.sm,
            paddingHorizontal: spacing.md,
            borderRadius: radius.md,
            borderWidth: 1,
            borderColor: theme.border,
            backgroundColor: theme.surfaceAlt,
          },
          animatedStyle,
        ]}
      >
        <Text style={[type.body, { color: theme.text }]}>{text}</Text>
      </Animated.View>
    </GestureDetector>
  );
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx jest src/ui/MatchingInput.test.tsx`
Expected: PASS

- [ ] **Step 5: Typecheck**

Run: `npm run typecheck`
Expected: no errors

- [ ] **Step 6: Commit and push**

```bash
git add src/ui/MatchingInput.tsx src/ui/MatchingInput.test.tsx
git commit -m "Replace matching tap-to-pair with a draggable answer bank"
git push
```

---

### Task 6: Full verification and manual browser check

**Files:** none (verification only).

**Interfaces:** none — this task only runs checks and reports results.

- [ ] **Step 1: Run the full test suite**

Run: `npm test`
Expected: PASS, all suites green (including `src/ui/QuestionCard.test.tsx` and `src/ui/RunnerView.test.tsx`, which exercise these inputs indirectly).

- [ ] **Step 2: Typecheck the whole project**

Run: `npm run typecheck`
Expected: no errors

- [ ] **Step 3: Manual browser verification**

Start the web build (`npm run web`), open a set containing an ordering question and one containing a matching question (create one via the in-app set builder if the bundled content doesn't have one handy), and manually verify with a mouse:
- Ordering: dragging a row up/down reorders the list live, drop settles into place, and after "reveal" rows are locked and colored correctly.
- Matching: dragging a bank chip onto a left slot places it and removes it from the bank; dragging a placed chip to a different slot moves it (and does not duplicate); dragging a placed chip out to empty space returns it to the bank; after "reveal" nothing is draggable and correct/incorrect coloring matches.

If anything looks or behaves wrong, fix it directly (this is exploratory/visual QA, not a new task to hand to a fresh subagent) and re-run the affected checks above.

- [ ] **Step 4: Commit any manual-QA fixes and push**

```bash
git add -A
git commit -m "Fix issues found during manual drag-and-drop verification"
git push
```

(Skip this step if Step 3 found nothing to fix.)

- [ ] **Step 5: Finish the branch**

Use `superpowers:finishing-a-development-branch` to merge `worktree-drag-drop-question-types` into `main` and push `origin/main`.
