import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react-native';
import type { MatchingQuestion } from '@/core/schema';
import { MatchingInput } from './MatchingInput';

const question: MatchingQuestion = {
  id: 'q-mat',
  type: 'matching',
  prompt: 'Match these',
  left: [
    { id: 'l1', text: 'Latency' },
    { id: 'l2', text: 'Throughput' },
  ],
  right: [
    { id: 'r1', text: 'Time for one request' },
    { id: 'r2', text: 'Requests per second' },
  ],
  pairs: [
    { left: 'l1', right: 'r1' },
    { left: 'l2', right: 'r2' },
  ],
};

describe('MatchingInput', () => {
  it('renders every left and right item', async () => {
    await render(
      <MatchingInput question={question} response={[]} revealed={false} onChange={() => {}} />,
    );
    expect(screen.getByTestId('left-l1')).toBeTruthy();
    expect(screen.getByTestId('right-r2')).toBeTruthy();
  });

  it('pairs a left item with the next right item tapped', async () => {
    const onChange = jest.fn();
    await render(
      <MatchingInput question={question} response={[]} revealed={false} onChange={onChange} />,
    );
    await fireEvent.press(screen.getByTestId('left-l1'));
    await fireEvent.press(screen.getByTestId('right-r1'));
    expect(onChange).toHaveBeenCalledWith(['l1:r1']);
  });

  it('replaces an existing pair for the same left item', async () => {
    const onChange = jest.fn();
    await render(
      <MatchingInput question={question} response={['l1:r1']} revealed={false} onChange={onChange} />,
    );
    await fireEvent.press(screen.getByTestId('left-l1'));
    await fireEvent.press(screen.getByTestId('right-r2'));
    expect(onChange).toHaveBeenCalledWith(['l1:r2']);
  });

  it('clears a pair when its left item is tapped while already paired', async () => {
    const onChange = jest.fn();
    await render(
      <MatchingInput question={question} response={['l1:r1']} revealed={false} onChange={onChange} />,
    );
    await fireEvent.press(screen.getByTestId('left-l1'));
    await fireEvent.press(screen.getByTestId('left-l1'));
    expect(onChange).toHaveBeenCalledWith([]);
  });

  it('shows the current pairing on the left item', async () => {
    await render(
      <MatchingInput question={question} response={['l1:r1']} revealed={false} onChange={() => {}} />,
    );
    expect(screen.getByTestId('left-l1').props.accessibilityLabel).toContain(
      'Time for one request',
    );
  });

  it('marks right and wrong pairs and locks input once revealed', async () => {
    const onChange = jest.fn();
    await render(
      <MatchingInput question={question} response={['l1:r2', 'l2:r1']} revealed onChange={onChange} />,
    );
    await fireEvent.press(screen.getByTestId('left-l1'));
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByTestId('left-l1').props.accessibilityLabel).toContain('incorrect');
  });
});
