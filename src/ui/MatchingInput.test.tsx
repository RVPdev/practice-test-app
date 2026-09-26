import { describe, expect, it } from '@jest/globals';
import { render, screen } from '@testing-library/react-native';
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
  it('renders every left slot and every unplaced right item in the bank', async () => {
    await render(
      <MatchingInput question={question} response={[]} revealed={false} onChange={() => {}} />,
    );
    expect(screen.getByTestId('left-l1')).toBeTruthy();
    expect(screen.getByTestId('left-l2')).toBeTruthy();
    expect(screen.getByTestId('right-r1')).toBeTruthy();
    expect(screen.getByTestId('right-r2')).toBeTruthy();
  });

  it('removes a placed answer from the bank and shows it in its slot', async () => {
    await render(
      <MatchingInput question={question} response={['l1:r1']} revealed={false} onChange={() => {}} />,
    );
    expect(screen.queryByTestId('right-r1')).toBeNull();
    expect(screen.getByTestId('placed-l1')).toBeTruthy();
    expect(screen.getByTestId('left-l1').props.accessibilityLabel).toContain(
      'Time for one request',
    );
  });

  it('marks right and wrong pairs once revealed', async () => {
    await render(
      <MatchingInput question={question} response={['l1:r2', 'l2:r1']} revealed onChange={() => {}} />,
    );
    expect(screen.getByTestId('left-l1').props.accessibilityLabel).toContain('incorrect');
    expect(screen.getByTestId('left-l2').props.accessibilityLabel).toContain('incorrect');
  });

  // A role-less View's label is ignored by screen readers on web (ARIA forbids naming a
  // generic element), which hid the pairing state and the correct/incorrect verdict.
  it('exposes each slot as a named group so its pairing state is announced', async () => {
    await render(
      <MatchingInput question={question} response={['l1:r1']} revealed={false} onChange={() => {}} />,
    );
    expect(
      screen.getByRole('group', { name: 'Latency, paired with Time for one request' }),
    ).toBeTruthy();
    expect(screen.getByRole('group', { name: 'Throughput, not paired' })).toBeTruthy();
  });

  it('disables dragging once revealed', async () => {
    await render(
      <MatchingInput question={question} response={['l1:r1']} revealed onChange={() => {}} />,
    );
    expect(screen.getByTestId('placed-l1').props.accessibilityState.disabled).toBe(true);
    expect(screen.getByTestId('left-l2').props.accessibilityState.disabled).toBe(true);
  });
});
