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

    await fireEvent.press(screen.getByTestId('set-dark'));

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

    await fireEvent.press(screen.getByTestId('set-dark'));
    await fireEvent.press(screen.getByTestId('set-light'));
    await fireEvent.press(screen.getByTestId('set-system'));
    await fireEvent.press(screen.getByTestId('set-dark'));

    await waitFor(() => expect(screen.getByTestId('mode').props.children).toBe('dark'));
    expect(await store.getItem(THEME_MODE_KEY)).toBe('dark');
  });
});
