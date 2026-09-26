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

    await fireEvent.press(screen.getByTestId('theme-mode-dark'));

    await waitFor(async () => expect(await store.getItem(THEME_MODE_KEY)).toBe('dark'));
    const activeLabel = await screen.findByText('Dark');
    expect(activeLabel.props.style).toEqual(
      expect.arrayContaining([expect.objectContaining({ color: darkTheme.accentText })]),
    );
  });
});
