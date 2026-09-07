import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react-native';
import type { Question } from '@/core/schema';
import type { SessionState } from '@/core/types';
import { RunnerView } from './RunnerView';

const question: Question = {
  id: 'q-1',
  type: 'single',
  prompt: 'Which one?',
  explanation: 'Alpha is first.',
  options: [
    { id: 'a', text: 'Alpha', correct: true, explanation: 'Correct.' },
    { id: 'b', text: 'Beta', correct: false, explanation: 'Wrong.' },
  ],
};

const baseState: SessionState = {
  attemptId: 'att_1',
  setId: 'set-1',
  setVersion: null,
  mode: 'practice',
  config: {
    questionCount: 3,
    timeLimitMinutes: null,
    passingScore: 70,
    shuffleQuestions: false,
    shuffleOptions: false,
    seed: 1,
  },
  questionIds: ['q-1', 'q-2', 'q-3'],
  index: 0,
  answers: {},
  revealed: [],
  timeMs: {},
  startedAt: '2026-09-06T14:00:00.000Z',
  deadlineAt: null,
  enteredAt: 0,
  status: 'active',
};

const props = (over: Partial<React.ComponentProps<typeof RunnerView>> = {}) => ({
  state: baseState,
  question,
  optionOrder: ['a', 'b'],
  remaining: null,
  onAnswer: jest.fn(),
  onReveal: jest.fn(),
  onNext: jest.fn(),
  onPrev: jest.fn(),
  onSubmit: jest.fn(),
  ...over,
});

describe('RunnerView in practice mode', () => {
  it('shows progress as question x of y', async () => {
    await render(<RunnerView {...props()} />);
    expect(screen.getByText('Question 1 of 3')).toBeTruthy();
  });

  it('disables submit until something is selected', async () => {
    await render(<RunnerView {...props()} />);
    expect(screen.getByTestId('reveal').props.accessibilityState.disabled).toBe(true);
  });

  it('reveals the answer when submit is pressed', async () => {
    const onReveal = jest.fn();
    await render(<RunnerView {...props({ state: { ...baseState, answers: { 'q-1': ['b'] } }, onReveal })} />);
    fireEvent.press(screen.getByTestId('reveal'));
    expect(onReveal).toHaveBeenCalled();
  });

  it('shows feedback and a Next button once revealed, and no auto-advance', async () => {
    const onNext = jest.fn();
    await render(
      <RunnerView
        {...props({
          state: { ...baseState, answers: { 'q-1': ['b'] }, revealed: ['q-1'] },
          onNext,
        })}
      />,
    );
    expect(screen.getByTestId('feedback')).toBeTruthy();
    expect(onNext).not.toHaveBeenCalled();
    fireEvent.press(screen.getByTestId('next'));
    expect(onNext).toHaveBeenCalledTimes(1);
  });

  it('offers Finish instead of Next on the last question', async () => {
    const onSubmit = jest.fn();
    await render(
      <RunnerView
        {...props({
          state: { ...baseState, index: 2, answers: { 'q-1': ['a'] }, revealed: ['q-1'] },
          onSubmit,
        })}
      />,
    );
    fireEvent.press(screen.getByTestId('finish'));
    expect(onSubmit).toHaveBeenCalled();
  });

  it('shows no timer and no back button in practice mode', async () => {
    await render(<RunnerView {...props()} />);
    expect(screen.queryByTestId('timer')).toBeNull();
    expect(screen.queryByTestId('prev')).toBeNull();
  });
});
