import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react-native';
import type { SessionState } from '@/core/types';
import { QuestionGrid } from './QuestionGrid';

const state = {
  questionIds: ['q-1', 'q-2', 'q-3'],
  index: 1,
  answers: { 'q-1': ['a'], 'q-3': [] },
} as unknown as SessionState;

describe('QuestionGrid', () => {
  it('renders one cell per question', async () => {
    await render(<QuestionGrid state={state} onGoto={() => {}} />);
    expect(screen.getAllByTestId(/^grid-cell-/)).toHaveLength(3);
  });

  it('marks answered, unanswered and current cells', async () => {
    await render(<QuestionGrid state={state} onGoto={() => {}} />);
    expect(screen.getByTestId('grid-cell-0').props.accessibilityLabel).toBe('Question 1, answered');
    expect(screen.getByTestId('grid-cell-1').props.accessibilityLabel).toBe(
      'Question 2, unanswered, current',
    );
    expect(screen.getByTestId('grid-cell-2').props.accessibilityLabel).toBe(
      'Question 3, unanswered',
    );
  });

  it('jumps to a question when a cell is tapped', async () => {
    const onGoto = jest.fn();
    await render(<QuestionGrid state={state} onGoto={onGoto} />);
    await fireEvent.press(screen.getByTestId('grid-cell-2'));
    expect(onGoto).toHaveBeenCalledWith(2);
  });
});
