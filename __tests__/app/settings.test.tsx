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

    await fireEvent.press(view.getByTestId('theme-mode-dark'));

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
      expect.arrayContaining([expect.objectContaining({ color: darkTheme.highlightText })]),
    );
  });
});
