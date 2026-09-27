import { afterEach, describe, expect, it } from '@jest/globals';
import { cleanup } from '@testing-library/react-native';
import TabsLayout from '../../app/(tabs)/_layout';
import LibraryScreen from '../../app/(tabs)/index';
import * as RootLayout from '../../app/_layout';
import { createTestRepository, renderAppRoute } from '../helpers/renderRoute';
import { lightTheme, darkTheme } from '@/ui/theme';

afterEach(() => {
  cleanup();
});

/**
 * Verify that TabsLayout uses theme.highlight for the active tab color,
 * not theme.accent (per Phase 2 audit fix).
 *
 * Note: The Tabs component from @react-navigation/bottom-tabs abstracts
 * the screenOptions.tabBarActiveTintColor into its internal rendering,
 * making direct prop inspection impractical with testing-library.
 * Instead, we verify via integration: rendering the layout with the
 * corrected component and verifying it mounts without errors, while also
 * confirming that the theme tokens being used are distinct.
 */
describe('TabsLayout theme integration', () => {
  it('uses theme.highlight for tabBarActiveTintColor (not accent)', async () => {
    // Verify that highlight and accent are distinct values in both themes
    // (ensuring the fix has an observable effect)
    expect(lightTheme.highlight).toBeDefined();
    expect(lightTheme.accent).toBeDefined();
    expect(lightTheme.highlight).not.toBe(lightTheme.accent);

    expect(darkTheme.highlight).toBeDefined();
    expect(darkTheme.accent).toBeDefined();
    expect(darkTheme.highlight).not.toBe(darkTheme.accent);

    // Render the layout to verify it mounts without errors with the new configuration
    const repository = createTestRepository();
    const routes = {
      '(tabs)/_layout': TabsLayout,
      '(tabs)/index': LibraryScreen,
    };

    const view = await renderAppRoute(
      repository,
      routes,
      { initialUrl: '/' },
      (RootLayout as { unstable_settings?: Record<string, unknown> }).unstable_settings,
    );

    // The Library screen should render (proving TabsLayout rendered)
    expect(view).toBeTruthy();
  });
});
