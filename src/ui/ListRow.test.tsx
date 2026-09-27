import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import { ListRow } from './ListRow';
import { lightTheme } from './theme';

describe('ListRow', () => {
  it('renders its children', async () => {
    await render(
      <ListRow testID="row-1">
        <Text>Cloud Basics</Text>
      </ListRow>,
    );
    expect(screen.getByText('Cloud Basics')).toBeTruthy();
  });

  it('shows a bottom hairline by default', async () => {
    await render(
      <ListRow testID="row-1">
        <Text>Cloud Basics</Text>
      </ListRow>,
    );
    expect(screen.getByTestId('row-1').props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ borderBottomWidth: 1, borderBottomColor: lightTheme.border }),
      ]),
    );
  });

  it('omits the hairline on the last row', async () => {
    await render(
      <ListRow testID="row-1" isLast>
        <Text>Cloud Basics</Text>
      </ListRow>,
    );
    expect(screen.getByTestId('row-1').props.style).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ borderBottomWidth: 1 })]),
    );
  });

  it('never applies a shadow (that is the outer Card wrapper\'s job)', async () => {
    await render(
      <ListRow testID="row-1">
        <Text>Cloud Basics</Text>
      </ListRow>,
    );
    const flat = [screen.getByTestId('row-1').props.style].flat();
    expect(flat.some((s) => s && typeof s === 'object' && 'boxShadow' in s)).toBe(false);
  });

  it('calls onPress when pressed', async () => {
    const onPress = jest.fn();
    await render(
      <ListRow testID="row-1" onPress={onPress}>
        <Text>Cloud Basics</Text>
      </ListRow>,
    );
    await fireEvent.press(screen.getByTestId('row-1'));
    expect(onPress).toHaveBeenCalled();
  });

  it('renders as a plain (non-pressable) view when there is no onPress', async () => {
    await render(
      <ListRow testID="row-1">
        <Text>Cloud Basics</Text>
      </ListRow>,
    );
    expect(screen.getByTestId('row-1').props.accessibilityRole).toBeUndefined();
  });
});
