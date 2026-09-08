import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { useState } from 'react';
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
  onGoto: jest.fn(),
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

describe('RunnerView in mock mode', () => {
  const mockState = { ...baseState, mode: 'mock' as const, deadlineAt: '2026-09-06T14:30:00.000Z' };

  it('shows the timer and the question grid', async () => {
    await render(<RunnerView {...props({ state: mockState, remaining: 125000 })} />);
    expect(screen.getByText('02:05')).toBeTruthy();
    expect(screen.getAllByTestId(/^grid-cell-/)).toHaveLength(3);
  });

  it('shows no feedback even when a question is answered', async () => {
    await render(
      <RunnerView {...props({ state: { ...mockState, answers: { 'q-1': ['b'] } }, remaining: 60000 })} />,
    );
    expect(screen.queryByTestId('feedback')).toBeNull();
  });

  it('allows navigating back and forward', async () => {
    const onPrev = jest.fn();
    const onNext = jest.fn();
    await render(<RunnerView {...props({ state: { ...mockState, index: 1 }, remaining: 60000, onPrev, onNext })} />);
    await fireEvent.press(screen.getByTestId('prev'));
    await fireEvent.press(screen.getByTestId('next'));
    expect(onPrev).toHaveBeenCalled();
    expect(onNext).toHaveBeenCalled();
  });

  it('offers submit from any question, not only the last', async () => {
    const onSubmit = jest.fn();
    await render(<RunnerView {...props({ state: mockState, remaining: 60000, onSubmit })} />);
    await fireEvent.press(screen.getByTestId('submit-test'));
    expect(onSubmit).toHaveBeenCalled();
  });

  it('names the number of unanswered questions on the submit control', async () => {
    await render(
      <RunnerView {...props({ state: { ...mockState, answers: { 'q-1': ['a'] } }, remaining: 60000 })} />,
    );
    expect(screen.getByText('Submit test (2 unanswered)')).toBeTruthy();
  });
});

describe('RunnerView with an ordering question', () => {
  const orderingQuestion: Question = {
    id: 'q-1',
    type: 'ordering',
    prompt: 'Order these',
    items: [
      { id: 'i1', text: 'Plan' },
      { id: 'i2', text: 'Build' },
      { id: 'i3', text: 'Ship' },
    ],
    correctOrder: ['i1', 'i2', 'i3'],
  };

  /** A minimal stand-in for the session runner, so answers actually round-trip. */
  function Harness({ itemOrder }: { itemOrder: string[] }) {
    const [answers, setAnswers] = useState<Record<string, string[]>>({});
    return (
      <RunnerView
        {...props({
          state: { ...baseState, answers },
          question: orderingQuestion,
          optionOrder: [],
          itemOrder,
          onAnswer: (response: string[]) =>
            setAnswers((prev) => ({ ...prev, [orderingQuestion.id]: response })),
        })}
      />
    );
  }

  it('lets a user who agrees with the presented order submit without perturbing it', async () => {
    await render(<Harness itemOrder={['i3', 'i1', 'i2']} />);
    // No taps at all: the presented order is already the recorded answer.
    expect(screen.getByTestId('reveal').props.accessibilityState.disabled).toBe(false);
    const rows = screen.getAllByTestId(/^order-row-/).map((n) => n.props.testID);
    expect(rows).toEqual(['order-row-i3', 'order-row-i1', 'order-row-i2']);
  });
});
