# Theme Mode Toggle (Phase 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a manual Light/Dark/System theme override, persisted across app restarts, exposed through a new Settings tab.

**Architecture:** A new `ThemeModeProvider` context holds the current mode and persists it through the existing `KVStore` abstraction (not the `Repository`, since this is a UI preference, not test content). `theme.ts`'s `useTheme()` reads that context internally — falling back to the OS scheme when mode is `system` — so its signature and every existing call site stay untouched. A new `SettingsView` + `app/(tabs)/settings.tsx` route + third tab expose the toggle.

**Tech Stack:** Expo Router, React Native, `@react-native-async-storage/async-storage` (via the existing `KVStore`/`asyncStorageKv` abstraction), Jest + `@testing-library/react-native`.

**Spec:** `docs/superpowers/specs/2026-09-26-theme-mode-phase1-design.md`

## Global Constraints

- Mode is one of `'light' | 'dark' | 'system'`, default `'system'`.
- Persisted under key `` `${KEY_PREFIX}themeMode` `` (i.e. `pt:themeMode`, `KEY_PREFIX` from `src/data/storage.ts`) — reuse the constant, never hardcode the literal.
- `useTheme(): Theme`'s signature and both `lightTheme`/`darkTheme` objects are unchanged. No existing call site of `useTheme()` may need editing.
- Theme mode does **not** go through the `Repository` interface — persist via `KVStore` directly (`src/data/kv.ts`), mirroring `RepositoryProvider`'s injectable-store-for-tests pattern.
- No palette, typography, or font changes in this plan — Phase 2's job, not this one.
- `useColorScheme` (from `react-native`) is called only inside `theme.ts` today (verified by repo-wide grep) — no other file needs to change for the override to take effect everywhere.

## Review Focus

- A corrupted or pre-`pt:themeMode` persisted value (e.g. leftover garbage, or a value that isn't one of the three modes) must resolve to `'system'`, not crash the app on launch. → Task 1.
- Dozens of existing component tests (`Button.test.tsx`, `Card`-based views, etc.) render UI bare, with **no** provider tree at all, and call `useTheme()` transitively. Those must keep resolving exactly as before (OS scheme, no throw, no context-missing error). → Tasks 1 and 2.
- Rapid repeated taps on the Settings buttons must not let an earlier, slower persisted write clobber a later tap's value — last tap wins in the store. → Task 1.
- The persisted mode must actually reach the visible UI end-to-end through the real route (not just inside the provider's own unit test) — i.e. a pre-existing persisted `'dark'` value renders the Dark button as active on load through `app/(tabs)/settings.tsx`. → Task 5.
- Every existing route test (`history`, `library`, `results`, `deep-link-back`) must keep passing unmodified after the shared test-layout helper gains theme-mode wiring. → Task 4 and Task 5.

---

### Task 1: `ThemeModeProvider`

**Files:**
- Create: `src/ui/ThemeModeProvider.tsx`
- Test: `src/ui/ThemeModeProvider.test.tsx`

**Interfaces:**
- Produces: `export type ThemeMode = 'light' | 'dark' | 'system'`; `export function useThemeMode(): { mode: ThemeMode; setMode: (mode: ThemeMode) => void }` (never throws — returns a safe default when no provider is present); `export function ThemeModeProvider({ children, store }: { children: ReactNode; store?: KVStore }): JSX.Element | null`.

- [ ] **Step 1: Write the failing tests**

```tsx
// src/ui/ThemeModeProvider.test.tsx
import { afterEach, describe, expect, it } from '@jest/globals';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Text } from 'react-native';
import { createMemoryKv } from '@/data/kv';
import { KEY_PREFIX } from '@/data/storage';
import { ThemeModeProvider, useThemeMode } from './ThemeModeProvider';

afterEach(() => {
  cleanup();
});

const THEME_MODE_KEY = `${KEY_PREFIX}themeMode`;

function ModeProbe() {
  const { mode, setMode } = useThemeMode();
  return (
    <>
      <Text testID="mode">{mode}</Text>
      <Text testID="set-dark" onPress={() => setMode('dark')}>set dark</Text>
      <Text testID="set-light" onPress={() => setMode('light')}>set light</Text>
      <Text testID="set-system" onPress={() => setMode('system')}>set system</Text>
    </>
  );
}

describe('useThemeMode', () => {
  it('returns a safe system default with no provider in the tree', async () => {
    await render(<ModeProbe />);
    expect(screen.getByTestId('mode').props.children).toBe('system');
  });
});

describe('ThemeModeProvider', () => {
  it('defaults to system when the store is empty', async () => {
    await render(
      <ThemeModeProvider store={createMemoryKv()}>
        <ModeProbe />
      </ThemeModeProvider>,
    );
    await waitFor(() => expect(screen.getByTestId('mode').props.children).toBe('system'));
  });

  it('hydrates a previously persisted mode', async () => {
    await render(
      <ThemeModeProvider store={createMemoryKv({ [THEME_MODE_KEY]: 'dark' })}>
        <ModeProbe />
      </ThemeModeProvider>,
    );
    await waitFor(() => expect(screen.getByTestId('mode').props.children).toBe('dark'));
  });

  it('falls back to system when the persisted value is corrupted', async () => {
    await render(
      <ThemeModeProvider store={createMemoryKv({ [THEME_MODE_KEY]: 'blue' })}>
        <ModeProbe />
      </ThemeModeProvider>,
    );
    await waitFor(() => expect(screen.getByTestId('mode').props.children).toBe('system'));
  });

  it('setMode updates the context value and persists to the store', async () => {
    const store = createMemoryKv();
    await render(
      <ThemeModeProvider store={store}>
        <ModeProbe />
      </ThemeModeProvider>,
    );
    await waitFor(() => expect(screen.getByTestId('mode').props.children).toBe('system'));

    fireEvent.press(screen.getByTestId('set-dark'));

    await waitFor(() => expect(screen.getByTestId('mode').props.children).toBe('dark'));
    expect(await store.getItem(THEME_MODE_KEY)).toBe('dark');
  });

  it('the last of several rapid taps wins in the persisted store', async () => {
    const store = createMemoryKv();
    await render(
      <ThemeModeProvider store={store}>
        <ModeProbe />
      </ThemeModeProvider>,
    );
    await waitFor(() => expect(screen.getByTestId('mode').props.children).toBe('system'));

    fireEvent.press(screen.getByTestId('set-dark'));
    fireEvent.press(screen.getByTestId('set-light'));
    fireEvent.press(screen.getByTestId('set-system'));
    fireEvent.press(screen.getByTestId('set-dark'));

    await waitFor(() => expect(screen.getByTestId('mode').props.children).toBe('dark'));
    expect(await store.getItem(THEME_MODE_KEY)).toBe('dark');
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx jest src/ui/ThemeModeProvider.test.tsx`
Expected: FAIL — `Cannot find module './ThemeModeProvider'`.

- [ ] **Step 3: Write the implementation**

```tsx
// src/ui/ThemeModeProvider.tsx
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { asyncStorageKv } from '@/data/asyncStorageKv';
import type { KVStore } from '@/data/kv';
import { KEY_PREFIX } from '@/data/storage';

export type ThemeMode = 'light' | 'dark' | 'system';

const THEME_MODE_KEY = `${KEY_PREFIX}themeMode`;
const VALID_MODES: readonly ThemeMode[] = ['light', 'dark', 'system'];

type ThemeModeContextValue = {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
};

// Unlike RepositoryProvider/ConfirmProvider, this context carries a safe
// default (system, no-op setMode) instead of throwing when unwrapped:
// useTheme() is called by nearly every leaf component, including ones
// under bare component-level tests with no provider tree at all, and
// those must keep resolving to the OS color scheme exactly as before.
const ThemeModeContext = createContext<ThemeModeContextValue>({
  mode: 'system',
  setMode: () => {},
});

export function useThemeMode(): ThemeModeContextValue {
  return useContext(ThemeModeContext);
}

function isThemeMode(value: string | null): value is ThemeMode {
  return value !== null && (VALID_MODES as string[]).includes(value);
}

export function ThemeModeProvider({
  children,
  store,
}: {
  children: ReactNode;
  /** Tests inject an in-memory store; the app leaves this undefined. */
  store?: KVStore;
}) {
  const kv = useMemo(() => store ?? asyncStorageKv, [store]);
  const [mode, setModeState] = useState<ThemeMode>('system');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    kv.getItem(THEME_MODE_KEY).then((stored) => {
      if (cancelled) return;
      if (isThemeMode(stored)) setModeState(stored);
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [kv]);

  const setMode = useCallback(
    (next: ThemeMode) => {
      setModeState(next);
      void kv.setItem(THEME_MODE_KEY, next);
    },
    [kv],
  );

  const value = useMemo(() => ({ mode, setMode }), [mode, setMode]);

  if (!ready) return null;

  return <ThemeModeContext.Provider value={value}>{children}</ThemeModeContext.Provider>;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx jest src/ui/ThemeModeProvider.test.tsx`
Expected: PASS (7 tests)

- [ ] **Step 5: Commit**

```bash
git add src/ui/ThemeModeProvider.tsx src/ui/ThemeModeProvider.test.tsx
git commit -m "Add ThemeModeProvider for a persisted light/dark/system override"
```

---

### Task 2: Wire `theme.ts` to the theme mode

**Files:**
- Modify: `src/ui/theme.ts`
- Test: `src/ui/theme.test.tsx` (new)

**Interfaces:**
- Consumes: `useThemeMode()` from Task 1 (`src/ui/ThemeModeProvider.tsx`).
- Produces: `useTheme(): Theme` — signature and `lightTheme`/`darkTheme` objects unchanged.

- [ ] **Step 1: Write the failing tests**

```tsx
// src/ui/theme.test.tsx
import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { cleanup, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import { createMemoryKv } from '@/data/kv';
import { KEY_PREFIX } from '@/data/storage';
import { darkTheme, lightTheme, useTheme } from './theme';
import { ThemeModeProvider } from './ThemeModeProvider';

// Scoped to this file only: theme.ts's default (system) path calls the real
// useColorScheme, whose Jest default is untested/implicit. Pin it to a known
// value so the "system" and "no provider" cases are deterministic instead of
// depending on that default. jest.mock calls are hoisted above the imports
// above by babel-plugin-jest-hoist, so this applies before theme.ts loads.
jest.mock('react-native', () => {
  const actual = jest.requireActual('react-native');
  return { ...actual, useColorScheme: () => 'light' };
});

afterEach(() => {
  cleanup();
});

function ThemeProbe() {
  const theme = useTheme();
  return <Text testID="bg">{theme.background}</Text>;
}

describe('useTheme', () => {
  it('falls back to the OS color scheme with no ThemeModeProvider in the tree', async () => {
    await render(<ThemeProbe />);
    expect(screen.getByTestId('bg').props.children).toBe(lightTheme.background);
  });

  it('follows the OS scheme when mode is system', async () => {
    await render(
      <ThemeModeProvider store={createMemoryKv()}>
        <ThemeProbe />
      </ThemeModeProvider>,
    );
    await screen.findByTestId('bg');
    expect(screen.getByTestId('bg').props.children).toBe(lightTheme.background);
  });

  it('overrides to dark even though the OS scheme is light', async () => {
    await render(
      <ThemeModeProvider store={createMemoryKv({ [`${KEY_PREFIX}themeMode`]: 'dark' })}>
        <ThemeProbe />
      </ThemeModeProvider>,
    );
    await screen.findByTestId('bg');
    expect(screen.getByTestId('bg').props.children).toBe(darkTheme.background);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx jest src/ui/theme.test.tsx`
Expected: FAIL — background stays `lightTheme.background` in the "overrides to dark" case (mode is not read yet).

- [ ] **Step 3: Write the implementation**

```ts
// src/ui/theme.ts — only the bottom of the file changes
import { useColorScheme } from 'react-native';
import { useThemeMode } from './ThemeModeProvider';

// ...(spacing, radius, type, Theme, lightTheme, darkTheme all unchanged)...

export function useTheme(): Theme {
  const { mode } = useThemeMode();
  const scheme = useColorScheme();
  const effective = mode === 'system' ? scheme : mode;
  return effective === 'dark' ? darkTheme : lightTheme;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx jest src/ui/theme.test.tsx`
Expected: PASS (3 tests)

Then run the full existing test suite once to confirm the ~19 bare component tests that call `useTheme()` transitively (`Button.test.tsx`, `HistoryView.test.tsx`, etc.) are unaffected:

Run: `npx jest`
Expected: PASS (no regressions)

- [ ] **Step 5: Commit**

```bash
git add src/ui/theme.ts src/ui/theme.test.tsx
git commit -m "useTheme: resolve the effective theme through ThemeModeProvider"
```

---

### Task 3: `SettingsView`

**Files:**
- Create: `src/ui/SettingsView.tsx`
- Test: `src/ui/SettingsView.test.tsx`

**Interfaces:**
- Consumes: `useThemeMode()`, `ThemeModeProvider`, `ThemeMode` (Task 1); `useTheme`, `darkTheme`, `spacing`, `type` (Task 2/`theme.ts`); `Button` (`src/ui/Button.tsx`); `Screen` (`src/ui/Screen.tsx`).
- Produces: `export function SettingsView(): JSX.Element`, no props.

- [ ] **Step 1: Write the failing tests**

```tsx
// src/ui/SettingsView.test.tsx
import { afterEach, describe, expect, it } from '@jest/globals';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { createMemoryKv } from '@/data/kv';
import { KEY_PREFIX } from '@/data/storage';
import { SettingsView } from './SettingsView';
import { ThemeModeProvider } from './ThemeModeProvider';
import { darkTheme } from './theme';

afterEach(() => {
  cleanup();
});

const THEME_MODE_KEY = `${KEY_PREFIX}themeMode`;

describe('SettingsView', () => {
  it('renders all three theme options', async () => {
    await render(
      <ThemeModeProvider store={createMemoryKv()}>
        <SettingsView />
      </ThemeModeProvider>,
    );
    await waitFor(() => expect(screen.getByTestId('theme-mode-system')).toBeTruthy());
    expect(screen.getByTestId('theme-mode-light')).toBeTruthy();
    expect(screen.getByTestId('theme-mode-dark')).toBeTruthy();
  });

  it('marks the persisted active mode with the primary-variant text color', async () => {
    await render(
      <ThemeModeProvider store={createMemoryKv({ [THEME_MODE_KEY]: 'dark' })}>
        <SettingsView />
      </ThemeModeProvider>,
    );
    const activeLabel = await screen.findByText('Dark');
    const inactiveLabel = screen.getByText('Light');

    expect(activeLabel.props.style).toEqual(
      expect.arrayContaining([expect.objectContaining({ color: darkTheme.accentText })]),
    );
    expect(inactiveLabel.props.style).toEqual(
      expect.arrayContaining([expect.objectContaining({ color: darkTheme.text })]),
    );
  });

  it('tapping an option switches the active mode and persists it', async () => {
    const store = createMemoryKv();
    await render(
      <ThemeModeProvider store={store}>
        <SettingsView />
      </ThemeModeProvider>,
    );
    await waitFor(() => expect(screen.getByTestId('theme-mode-dark')).toBeTruthy());

    fireEvent.press(screen.getByTestId('theme-mode-dark'));

    await waitFor(async () => expect(await store.getItem(THEME_MODE_KEY)).toBe('dark'));
    const activeLabel = await screen.findByText('Dark');
    expect(activeLabel.props.style).toEqual(
      expect.arrayContaining([expect.objectContaining({ color: darkTheme.accentText })]),
    );
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx jest src/ui/SettingsView.test.tsx`
Expected: FAIL — `Cannot find module './SettingsView'`.

- [ ] **Step 3: Write the implementation**

```tsx
// src/ui/SettingsView.tsx
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

export function SettingsView() {
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
            variant={mode === option.mode ? 'primary' : 'secondary'}
            onPress={() => setMode(option.mode)}
            testID={`theme-mode-${option.mode}`}
          />
        ))}
      </View>
    </Screen>
  );
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx jest src/ui/SettingsView.test.tsx`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add src/ui/SettingsView.tsx src/ui/SettingsView.test.tsx
git commit -m "Add SettingsView with a Light/Dark/System control"
```

---

### Task 4: Wire `ThemeModeProvider` into `app/_layout.tsx`

**Files:**
- Modify: `app/_layout.tsx`

**Interfaces:**
- Consumes: `ThemeModeProvider` (Task 1).
- Produces: no change to any exported behavior — `unstable_settings` and the `Stack` screen list are unchanged, only the component tree above them gains a provider.

- [ ] **Step 1: Restructure the file**

```tsx
// app/_layout.tsx
import { Stack, usePathname } from 'expo-router';
import { useLayoutEffect } from 'react';
import { Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ConsentGate } from '@/ui/ConsentGate';
import { ConfirmProvider } from '@/ui/ConfirmProvider';
import { RepositoryProvider } from '@/data/RepositoryProvider';
import { ThemeModeProvider } from '@/ui/ThemeModeProvider';
import { useTheme } from '@/ui/theme';

export const unstable_settings = {
  anchor: '(tabs)',
};

function useBlurOnNavigateWeb() {
  const pathname = usePathname();
  useLayoutEffect(() => {
    if (Platform.OS !== 'web') return;
    (document.activeElement as HTMLElement | null)?.blur?.();
  }, [pathname]);
}

function AppRoot() {
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
              <Stack.Screen name="(tabs)" options={{ headerShown: false, title: 'Library' }} />
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

export default function RootLayout() {
  return (
    <ThemeModeProvider>
      <AppRoot />
    </ThemeModeProvider>
  );
}
```

- [ ] **Step 2: Run the full existing test suite to confirm no regressions**

Run: `npx jest`
Expected: PASS — every existing `__tests__/app/*.test.tsx` (history, library, results, deep-link-back, etc.) still passes unmodified, since none of them render the real `app/_layout.tsx` (they use `__tests__/helpers/renderRoute.tsx`'s own minimal test layout, untouched until Task 5).

- [ ] **Step 3: Commit**

```bash
git add app/_layout.tsx
git commit -m "Wrap the root layout in ThemeModeProvider"
```

---

### Task 5: Settings tab route

**Files:**
- Create: `app/(tabs)/settings.tsx`
- Modify: `app/(tabs)/_layout.tsx`
- Modify: `__tests__/helpers/renderRoute.tsx`
- Test: `__tests__/app/settings.test.tsx` (new)

**Interfaces:**
- Consumes: `SettingsView` (Task 3), `ThemeModeProvider` (Task 1), `createMemoryKv`/`KVStore` (`src/data/kv.ts`), `KEY_PREFIX` (`src/data/storage.ts`).
- Produces: `renderAppRoute`'s signature grows one new optional trailing parameter (`themeStore: KVStore = createMemoryKv()`) — all 4 existing call sites (`history.test.tsx`, `library.test.tsx`, `results.test.tsx`, `deep-link-back.test.tsx`) keep working unchanged since it's optional and last.

- [ ] **Step 1: Write the failing test**

```tsx
// __tests__/app/settings.test.tsx
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
const THEME_MODE_KEY = `${KEY_PREFIX}themeMode`;

describe('Settings screen (app/(tabs)/settings.tsx)', () => {
  it('renders the theme options', async () => {
    const view = await renderAppRoute(
      createTestRepository(),
      routes,
      { initialUrl: '/settings' },
      undefined,
      createMemoryKv(),
    );

    await waitFor(() => expect(view.getByTestId('theme-mode-system')).toBeTruthy());
    expect(view.getByTestId('theme-mode-light')).toBeTruthy();
    expect(view.getByTestId('theme-mode-dark')).toBeTruthy();
  });

  it('tapping Dark persists the mode to the injected theme store', async () => {
    const themeStore = createMemoryKv();
    const view = await renderAppRoute(
      createTestRepository(),
      routes,
      { initialUrl: '/settings' },
      undefined,
      themeStore,
    );
    await waitFor(() => expect(view.getByTestId('theme-mode-dark')).toBeTruthy());

    fireEvent.press(view.getByTestId('theme-mode-dark'));

    await waitFor(async () => expect(await themeStore.getItem(THEME_MODE_KEY)).toBe('dark'));
  });

  it('a previously persisted mode renders as active on load', async () => {
    const view = await renderAppRoute(
      createTestRepository(),
      routes,
      { initialUrl: '/settings' },
      undefined,
      createMemoryKv({ [THEME_MODE_KEY]: 'dark' }),
    );

    const activeLabel = await view.findByText('Dark');
    expect(activeLabel.props.style).toEqual(
      expect.arrayContaining([expect.objectContaining({ color: darkTheme.accentText })]),
    );
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx jest __tests__/app/settings.test.tsx`
Expected: FAIL — `Cannot find module '../../app/(tabs)/settings'`.

- [ ] **Step 3: Add the route, the tab, and wire the test helper**

```tsx
// app/(tabs)/settings.tsx
import { SettingsView } from '@/ui/SettingsView';

export default function SettingsScreen() {
  return <SettingsView />;
}
```

```tsx
// app/(tabs)/_layout.tsx — add one line inside <Tabs>
      <Tabs.Screen name="index" options={{ title: 'Library' }} />
      <Tabs.Screen name="history" options={{ title: 'History' }} />
      <Tabs.Screen name="settings" options={{ title: 'Settings' }} />
```

```tsx
// __tests__/helpers/renderRoute.tsx — full new contents
import type React from 'react';
import { Stack } from 'expo-router';
import { renderRouter, type RenderRouterOptions } from 'expo-router/testing-library';
import { RepositoryProvider } from '@/data/RepositoryProvider';
import { createMemoryKv, type KVStore } from '@/data/kv';
import type { Repository } from '@/data/repository';
import { createStorageRepository } from '@/data/storage';
import { ConfirmProvider } from '@/ui/ConfirmProvider';
import { ThemeModeProvider } from '@/ui/ThemeModeProvider';

/** A fresh repository backed by an in-memory KV store, isolated per test. */
export function createTestRepository(): Repository {
  return createStorageRepository(createMemoryKv());
}

function testRootLayout(repository: Repository, themeStore: KVStore) {
  return function TestRootLayout() {
    return (
      <RepositoryProvider repository={repository}>
        <ThemeModeProvider store={themeStore}>
          <ConfirmProvider>
            <Stack />
          </ConfirmProvider>
        </ThemeModeProvider>
      </RepositoryProvider>
    );
  };
}

/**
 * Renders a flat map of real route components (e.g. `{ index: LibraryScreen }`,
 * importing the default export straight from the matching `app/**` file) under
 * a root layout whose RepositoryProvider is backed by `repository` - the same
 * seeding (`seedBundledSets`) the real app runs still executes against it.
 *
 * Explicit per-test route maps sidestep a quirk of `renderRouter`'s `appDir`
 * mode: pointed at the project's real `app/` directory, its filesystem-based
 * route scanner fails to pick up the `(tabs)` route group at all (every path
 * resolves to expo-router's "Unmatched Route" screen, even `/`), so screens
 * normally reached through that group (Library, History) are mounted at
 * their bare path (e.g. `index`) instead of going through `appDir`.
 *
 * `@testing-library/react-native@14`'s `render()` is async, but
 * `expo-router/testing-library`'s `renderRouter()` (57.0.19) still attaches
 * its navigation helpers (`getPathname`, etc.) to the *unresolved promise*
 * it returns rather than to the resolved render result - so the raw return
 * value must be awaited before querying, and the helpers re-attached to what
 * it resolves to.
 *
 * Never call `cleanup()` manually mid-test (only via the standard
 * `afterEach(cleanup)`). A manual mid-test `cleanup()` between two renders in
 * the same `it()` corrupts expo-router's module-level router singleton for
 * every *subsequent* test in the file - later renders silently mount to a
 * null tree. If a test needs to inspect two different routes, split it into
 * two `it()` blocks instead.
 *
 * `rootSettings` becomes the test root layout's `unstable_settings` - pass the
 * real `app/_layout`'s export to test behavior that depends on it (e.g. the
 * stack anchor under a deep-linked screen).
 *
 * `themeStore` backs the test layout's `ThemeModeProvider`; defaults to a
 * fresh in-memory store per call so existing callers that don't pass it stay
 * isolated exactly as before.
 */
export async function renderAppRoute(
  repository: Repository,
  routes: Record<string, React.ComponentType>,
  options: RenderRouterOptions = {},
  rootSettings?: Record<string, unknown>,
  themeStore: KVStore = createMemoryKv(),
) {
  const _layout = { default: testRootLayout(repository, themeStore), unstable_settings: rootSettings };
  const pending = renderRouter({ ...routes, _layout }, options);
  const result = await pending;
  return Object.assign(result, {
    getPathname: pending.getPathname,
    getSegments: pending.getSegments,
    getSearchParams: pending.getSearchParams,
    getPathnameWithParams: pending.getPathnameWithParams,
    getRouterState: pending.getRouterState,
  });
}
```

- [ ] **Step 4: Run the new test, then the full suite**

Run: `npx jest __tests__/app/settings.test.tsx`
Expected: PASS (3 tests)

Run: `npx jest`
Expected: PASS — including `history.test.tsx`, `library.test.tsx`, `results.test.tsx`, `deep-link-back.test.tsx`, confirming the `renderAppRoute` signature change didn't break any existing call site.

- [ ] **Step 5: Commit**

```bash
git add "app/(tabs)/settings.tsx" "app/(tabs)/_layout.tsx" __tests__/helpers/renderRoute.tsx __tests__/app/settings.test.tsx
git commit -m "Add a Settings tab exposing the theme toggle"
```

---

### Task 6: Manual browser verification

**Files:** none (verification only — no code changes).

- [ ] **Step 1: Start the dev server and open it in the real browser**

Run (per `[[practice_test_workspace_layout]]`): start Expo with `CI=1` set (no file watcher needed for a one-off check), serving at `http://localhost:8081/`. Drive it with `puppeteer-core` against `/usr/bin/google-chrome-stable` from the session scratchpad, per the existing browser-testing convention for this repo.

- [ ] **Step 2: Check the golden path**

- Open the app; confirm a third "Settings" tab appears alongside Library/History.
- On Settings, confirm "System" is selected by default (primary-styled).
- Tap "Dark": confirm the Settings screen itself, and then Library/History after switching tabs, all switch to the dark palette (background/surface/text colors from `darkTheme`) without needing to touch OS settings.
- Reload the page (simulating a fresh launch): confirm the app comes back up already in dark mode (the persisted value survived), and Settings still shows "Dark" as active.
- Tap "Light", confirm it switches immediately and persists the same way across a reload.
- Tap "System": confirm it reverts to following the OS/browser color-scheme preference.

- [ ] **Step 3: Report findings**

If everything above holds, note it in the memory update for this feature (Task 7 territory, but do it as part of finishing the branch). If anything is off, fix it before treating Phase 1 as done — this mirrors this project's established practice of never calling a UI change complete on test-suite results alone.
