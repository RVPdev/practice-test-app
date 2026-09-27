import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { Button } from './Button';

describe('Button', () => {
  it('calls onPress when tapped', async () => {
    const onPress = jest.fn();
    await render(<Button title="Start" onPress={onPress} testID="start" />);
    fireEvent.press(screen.getByTestId('start'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does not call onPress when disabled', async () => {
    const onPress = jest.fn();
    await render(<Button title="Start" onPress={onPress} disabled testID="start" />);
    fireEvent.press(screen.getByTestId('start'));
    expect(onPress).not.toHaveBeenCalled();
  });

  it('renders its title', async () => {
    await render(<Button title="Submit answer" onPress={() => {}} />);
    expect(screen.getByText('Submit answer')).toBeTruthy();
  });

  // Jest resolves 'react-native' to the real native package, whose Pressable
  // merges the flat `aria-selected` prop into `accessibilityState.selected`
  // before it reaches the rendered node (see Pressable.js's `_accessibilityState`
  // construction) - so that's what shows up here. On a real web build, the
  // module resolved is react-native-web's Pressable instead, which does no such
  // merge and forwards `aria-selected` straight through to the DOM unchanged;
  // that path is checked separately with a real browser, not by this test.
  it('marks the highlight variant as selected for assistive tech', async () => {
    await render(<Button title="Dark" onPress={() => {}} variant="highlight" testID="dark" />);
    expect(screen.getByTestId('dark').props.accessibilityState.selected).toBe(true);
  });

  it('does not mark other variants as selected', async () => {
    await render(<Button title="Light" onPress={() => {}} variant="secondary" testID="light" />);
    expect(screen.getByTestId('light').props.accessibilityState.selected).toBe(false);
  });
});
