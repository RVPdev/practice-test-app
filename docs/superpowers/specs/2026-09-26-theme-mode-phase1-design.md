# Theme Mode Toggle (Phase 1) — Design Spec

**Date:** 2026-09-26
**Status:** Approved for implementation planning

## 1. Purpose

Add a manual Light/Dark/System theme override, persisted across launches. This is
Phase 1 of a two-phase initiative; it is the prerequisite for Phase 2 (the full
palette/typography/elevation visual redesign), which needs to be verified in both
modes without depending on OS settings. It closes the gap left by nav-chrome theming:
`Stack`/`Tabs` chrome already reads `theme.ts`, but there was no way to override the
OS-driven color scheme.

## 2. Scope

### In scope (Phase 1)

- Three-way mode: `light` / `dark` / `system`, default `system`.
- Persisted so the choice survives app restarts.
- New third tab, "Settings", holding a Light/Dark/System control.
- `theme.ts`'s `useTheme(): Theme` signature and return type are unchanged, so none of
  the app's existing `useTheme()` call sites need to change.

### Out of scope (deferred to Phase 2)

- Any palette, typography, or elevation changes — Phase 1 keeps the existing
  `lightTheme`/`darkTheme` color values exactly as they are today.
- The custom font (`expo-font`) integration.
- Any other Settings-tab content beyond the theme control.

## 3. Persistence — standalone store, not the Repository

Theme mode is a UI display preference, not test content, so it doesn't belong on the
`Repository` interface (`listSets`, `saveAttempt`, `getTermsAccepted`, ...) alongside
question-set data. Instead:

- Reuse the existing `KVStore` interface (`src/data/kv.ts`) directly.
- New key `` `${KEY_PREFIX}themeMode` `` → `pt:themeMode`, read/written through
  `asyncStorageKv` in the running app.
- `ThemeModeProvider` takes an optional injected `store?: KVStore` prop, mirroring
  `RepositoryProvider`'s injectable `repository?: Repository` prop, so tests can pass
  `createMemoryKv()` instead of touching real `AsyncStorage`.

`useColorScheme` is currently called only inside `theme.ts` (verified via repo-wide
grep), so overriding it there is sufficient — no other call site needs touching.

## 4. New files / changes

### `src/ui/ThemeModeProvider.tsx` (new)

- Context value: `{ mode: 'light' | 'dark' | 'system'; setMode: (mode) => void; ready: boolean }`.
- On mount, reads `pt:themeMode` from the store; defaults to `'system'` if the key is
  absent or its value isn't one of the three valid modes.
- `setMode` writes through to the store, then updates state.
- Renders children as `null` until hydrated — mirrors `ConsentGate`'s ready-gating, so
  there's no flash of the wrong theme before the persisted value loads.

### `src/ui/theme.ts` (modified)

- `useTheme()` resolves the *effective* theme via the new provider's `mode`, falling
  back to `useColorScheme()` only when `mode === 'system'`.
- Signature (`useTheme(): Theme`) and both exported theme objects are unchanged.

### `app/_layout.tsx` (restructured)

- A component can't consume a context provided by its own JSX. The current
  `RootLayout` body (which calls `useTheme()` for `Stack` header styling) moves into a
  new inner `AppRoot` component.
- A new thin `RootLayout` wraps `<AppRoot />` in `<ThemeModeProvider>`, placed outside
  `RepositoryProvider` / `ConfirmProvider` / `ConsentGate` since none of those depend on
  it.

### `src/ui/SettingsView.tsx` (new)

- Three existing `Button` components (Light / Dark / System). Active mode renders with
  `variant="primary"`, the other two with `variant="secondary"`.
- Pressing a button calls `setMode` from `ThemeModeProvider`.

### `app/(tabs)/settings.tsx` (new)

- Thin route wrapper rendering `<Screen><SettingsView /></Screen>`, matching
  `app/(tabs)/history.tsx`'s existing pattern.

### `app/(tabs)/_layout.tsx` (modified)

- Add a third `<Tabs.Screen name="settings" options={{ title: 'Settings' }} />`.

## 5. Tests

Follow exact existing conventions:

- `src/ui/ThemeModeProvider.test.tsx` — hydrates from an injected store, defaults to
  `system` when unset/invalid, `setMode` persists and updates context value.
- `src/ui/SettingsView.test.tsx` — renders three options, active one shows the primary
  variant, tapping a button calls `setMode`.
- `__tests__/app/settings.test.tsx` — via the existing `renderAppRoute` helper,
  mirroring `__tests__/app/history.test.tsx`.
- Existing `theme.ts` consumers' tests should keep passing unmodified since
  `useTheme()`'s signature and defaults (system scheme, no override) don't change.

## 6. Risks / open questions

None identified. The change is additive and isolated: the ~15 existing `useTheme()`
call sites keep their current signature, and the `Repository`/`storage.ts` layer is
untouched entirely.
