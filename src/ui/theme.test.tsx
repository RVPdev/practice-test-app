import { afterEach, describe, expect, it, jest } from '@jest/globals';

// Scoped to this file only: theme.ts's default (system) path calls the real
// useColorScheme, whose Jest default is untested/implicit. Pin it to a known
// value so the "system" and "no provider" cases are deterministic instead of
// depending on that default. jest.mock calls are hoisted above the imports
// above by babel-plugin-jest-hoist, so this applies before theme.ts loads.
jest.mock('react-native', () => {
  let actual: any;
  return new Proxy(
    { useColorScheme: () => 'light' },
    {
      get(target, prop) {
        if (prop === 'useColorScheme') {
          return target.useColorScheme;
        }
        // Lazy load the actual module on first non-useColorScheme access
        if (!actual) {
          actual = jest.requireActual('react-native');
        }
        return (actual as Record<string, any>)[prop];
      },
    },
  );
});

import { cleanup, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import { createMemoryKv } from '@/data/kv';
import { KEY_PREFIX } from '@/data/storage';
import { darkTheme, lightTheme, useTheme } from './theme';
import { ThemeModeProvider } from './ThemeModeProvider';

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
