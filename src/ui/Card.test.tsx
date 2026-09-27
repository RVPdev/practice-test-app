import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import { Card } from './Card';
import { shadows } from './theme';

describe('Card', () => {
  it('renders its children', async () => {
    await render(
      <Card testID="card-1">
        <Text>Hello</Text>
      </Card>,
    );
    expect(screen.getByText('Hello')).toBeTruthy();
  });

  it('applies the card elevation shadow', async () => {
    await render(
      <Card testID="card-1">
        <Text>Hello</Text>
      </Card>,
    );
    expect(screen.getByTestId('card-1').props.style).toEqual(
      expect.arrayContaining([expect.objectContaining({ boxShadow: shadows.card })]),
    );
  });

  it('calls onPress when pressable', async () => {
    const onPress = jest.fn();
    await render(
      <Card testID="card-1" onPress={onPress}>
        <Text>Hello</Text>
      </Card>,
    );
    await fireEvent.press(screen.getByTestId('card-1'));
    expect(onPress).toHaveBeenCalled();
  });
});
