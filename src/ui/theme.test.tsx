import { afterEach, describe, expect, it, jest } from '@jest/globals';

// Scoped to this file only: theme.ts's default (system) path calls the real
// useColorScheme, whose Jest default is untested/implicit. Pin it to a known
// value so the "system" and "no provider" cases are deterministic instead of
// depending on that default.
//
// This is a Proxy, not a simple `{ ...jest.requireActual('react-native'), useColorScheme: ... }`
// spread, because the spread eagerly evaluates every export on module load -
// including native-backed getters (e.g. DevMenu) that crash under Jest when
// touched outside a real native runtime. The Proxy only forwards the actual
// module lazily, on first access to a property other than useColorScheme.
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
import { darkTheme, lightTheme, shadows, type, useTheme } from './theme';
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

describe('palette (Phase 2: navy + amber)', () => {
  it('uses navy for the structural accent and amber for the highlight, in both modes', () => {
    expect(lightTheme.accent).toBe('#1e3a5f');
    expect(lightTheme.accentText).toBe('#ffffff');
    expect(lightTheme.highlight).toBe('#c2760c');
    expect(lightTheme.highlightText).toBe('#ffffff');

    expect(darkTheme.accent).toBe('#3a5d8a');
    expect(darkTheme.accentText).toBe('#ffffff');
    expect(darkTheme.highlight).toBe('#f0a839');
    expect(darkTheme.highlightText).toBe('#1e1b4b');
  });

  it('leaves correctness colors untouched by the new brand palette', () => {
    expect(lightTheme.positive).toBe('#1c7a4a');
    expect(lightTheme.negative).toBe('#b3261e');
    expect(darkTheme.positive).toBe('#5fd39b');
    expect(darkTheme.negative).toBe('#ff8a80');
  });
});

describe('type scale', () => {
  it('uses Sora for headings and Inter for body text, via loaded font files rather than a synthesized weight', () => {
    expect(type.title).toMatchObject({ fontFamily: 'Sora_700Bold' });
    expect(type.heading).toMatchObject({ fontFamily: 'Sora_600SemiBold' });
    expect(type.body).toMatchObject({ fontFamily: 'Inter_400Regular' });
    expect(type.label).toMatchObject({ fontFamily: 'Inter_600SemiBold' });
    expect(type.caption).toMatchObject({ fontFamily: 'Inter_400Regular' });
    expect(type.mono).toMatchObject({ fontFamily: 'Inter_600SemiBold' });
    expect(type.title).not.toHaveProperty('fontWeight');
  });
});

describe('shadows', () => {
  it('exports card and raised elevation levels as boxShadow strings', () => {
    expect(shadows.card).toBe('0 1px 2px rgba(0, 0, 0, 0.06)');
    expect(shadows.raised).toBe('0 4px 12px rgba(0, 0, 0, 0.12)');
  });
});
