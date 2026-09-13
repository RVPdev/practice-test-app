import type React from 'react';
import { Stack } from 'expo-router';
import { renderRouter, type RenderRouterOptions } from 'expo-router/testing-library';
import { RepositoryProvider } from '@/data/RepositoryProvider';
import { createMemoryKv } from '@/data/kv';
import type { Repository } from '@/data/repository';
import { createStorageRepository } from '@/data/storage';

/** A fresh repository backed by an in-memory KV store, isolated per test. */
export function createTestRepository(): Repository {
  return createStorageRepository(createMemoryKv());
}

function testRootLayout(repository: Repository) {
  return function TestRootLayout() {
    return (
      <RepositoryProvider repository={repository}>
        <Stack />
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
 */
export async function renderAppRoute(
  repository: Repository,
  routes: Record<string, React.ComponentType>,
  options: RenderRouterOptions = {},
) {
  const pending = renderRouter({ ...routes, _layout: testRootLayout(repository) }, options);
  const result = await pending;
  return Object.assign(result, {
    getPathname: pending.getPathname,
    getSegments: pending.getSegments,
    getSearchParams: pending.getSearchParams,
    getPathnameWithParams: pending.getPathnameWithParams,
    getRouterState: pending.getRouterState,
  });
}
