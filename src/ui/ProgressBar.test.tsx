import { describe, expect, it } from '@jest/globals';
import { render, screen } from '@testing-library/react-native';
import { ProgressBar } from './ProgressBar';
import { lightTheme } from './theme';

describe('ProgressBar', () => {
  it('defaults to the highlight tone, not accent', async () => {
    await render(<ProgressBar fraction={0.5} testID="fill" />);
    expect(screen.getByTestId('fill').props.style).toEqual(
      expect.arrayContaining([expect.objectContaining({ backgroundColor: lightTheme.highlight })]),
    );
  });

  it('uses the positive tone when passed explicitly', async () => {
    await render(<ProgressBar fraction={1} tone="positive" testID="fill" />);
    expect(screen.getByTestId('fill').props.style).toEqual(
      expect.arrayContaining([expect.objectContaining({ backgroundColor: lightTheme.positive })]),
    );
  });
});
