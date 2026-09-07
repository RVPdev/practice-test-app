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
});
