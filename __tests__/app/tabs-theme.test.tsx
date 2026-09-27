import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { cleanup, render } from '@testing-library/react-native';
import { lightTheme } from '@/ui/theme';

let capturedScreenOptions: Record<string, unknown> | undefined;

jest.mock('expo-router', () => {
  const actual = jest.requireActual<Record<string, unknown>>('expo-router');
  function MockTabs(props: { screenOptions?: Record<string, unknown> }) {
    capturedScreenOptions = props.screenOptions;
    return null;
  }
  function MockTabsScreen() {
    return null;
  }
  MockTabs.Screen = MockTabsScreen;
  return { ...actual, Tabs: MockTabs };
});

import TabsLayout from '../../app/(tabs)/_layout';

afterEach(() => {
  cleanup();
  capturedScreenOptions = undefined;
});

describe('TabsLayout', () => {
  it('sets tabBarActiveTintColor to theme.highlight, not theme.accent', async () => {
    await render(<TabsLayout />);
    expect(capturedScreenOptions?.tabBarActiveTintColor).toBe(lightTheme.highlight);
    expect(capturedScreenOptions?.tabBarActiveTintColor).not.toBe(lightTheme.accent);
  });
});
