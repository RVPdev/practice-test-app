import { afterEach, describe, expect, it } from '@jest/globals';
import { cleanup, fireEvent, waitFor } from '@testing-library/react-native';
import * as RootLayout from '../../app/_layout';
import TabsLayout from '../../app/(tabs)/_layout';
import LibraryScreen from '../../app/(tabs)/index';
import NewSetScreen from '../../app/builder/new';
import { createTestRepository, renderAppRoute } from '../helpers/renderRoute';

afterEach(() => {
  cleanup();
});

const routes = {
  '(tabs)/_layout': TabsLayout,
  '(tabs)/index': LibraryScreen,
  'builder/new': NewSetScreen,
};

// A page opened straight at its own URL (browser refresh, a reloaded background
// tab, a shared link) has no in-app history. Without an anchor underneath it, every
// router.back() on that screen was an unhandled GO_BACK - the button did nothing.
describe('Deep-linked screens (app/_layout.tsx anchor)', () => {
  it('can go back to the Library from a screen opened at its own URL', async () => {
    const repository = createTestRepository();
    const view = await renderAppRoute(
      repository,
      routes,
      { initialUrl: '/builder/new' },
      (RootLayout as { unstable_settings?: Record<string, unknown> }).unstable_settings,
    );
    await waitFor(() => expect(view.getByTestId('builder-cancel')).toBeTruthy());

    await fireEvent.press(view.getByTestId('builder-cancel'));

    await waitFor(() => expect(view.getPathname()).toBe('/'));
  });
});
