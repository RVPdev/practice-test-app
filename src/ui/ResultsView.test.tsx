import { describe, expect, it } from '@jest/globals';
import { render, screen } from '@testing-library/react-native';
import type { QuestionSet } from '@/core/schema';
import type { Attempt } from '@/core/types';
import { ResultsView } from './ResultsView';

const set: QuestionSet = {
  schemaVersion: 1,
  id: 'set-1',
  title: 'Cloud Basics',
  version: '1.0.0',
  topics: [
    { id: 'storage', name: 'Storage' },
    { id: 'network', name: 'Networking' },
  ],
  questions: [
    {
      id: 'q-1',
      type: 'single',
      topicId: 'storage',
      prompt: 'Which storage?',
      options: [
        { id: 'a', text: 'Object', correct: true, explanation: 'Correct.' },
        { id: 'b', text: 'Block', correct: false, explanation: 'Wrong.' },
      ],
    },
    {
      id: 'q-2',
      type: 'boolean',
      topicId: 'network',
      prompt: 'Public IP required?',
      answer: false,
      explanation: 'No, private addresses work.',
    },
  ],
};

const attempt: Attempt = {
  id: 'att_1',
  setId: 'set-1',
  setVersion: '1.0.0',
  mode: 'mock',
  startedAt: '2026-09-06T14:00:00.000Z',
  finishedAt: '2026-09-06T14:20:00.000Z',
  config: {
    questionCount: 2,
    timeLimitMinutes: 30,
    passingScore: 70,
    shuffleQuestions: true,
    shuffleOptions: true,
    seed: 1,
  },
  score: { correct: 1, total: 2, percent: 50, passed: false },
  byTopic: [
    { topicId: 'storage', correct: 1, total: 1 },
    { topicId: 'network', correct: 0, total: 1 },
  ],
  answers: [
    { questionId: 'q-1', response: ['a'], correct: true, timeMs: 12000 },
    { questionId: 'q-2', response: ['true'], correct: false, timeMs: 8000 },
  ],
};

describe('ResultsView', () => {
  it('shows the score and the pass verdict', async () => {
    await render(<ResultsView attempt={attempt} set={set} onDone={() => {}} />);
    expect(screen.getByText('50%')).toBeTruthy();
    expect(screen.getByText(/Did not pass/)).toBeTruthy();
    expect(screen.getByText('1 of 2 correct')).toBeTruthy();
  });

  it('shows a pass verdict when the score clears the bar', async () => {
    const passed = {
      ...attempt,
      score: { correct: 2, total: 2, percent: 100, passed: true },
    };
    await render(<ResultsView attempt={passed} set={set} onDone={() => {}} />);
    expect(screen.getByText(/Passed/)).toBeTruthy();
  });

  it('shows elapsed time', async () => {
    await render(<ResultsView attempt={attempt} set={set} onDone={() => {}} />);
    expect(screen.getByText('20m 0s')).toBeTruthy();
  });

  it('lists topics weakest first, using their display names', async () => {
    await render(<ResultsView attempt={attempt} set={set} onDone={() => {}} />);
    const rows = screen.getAllByTestId(/^topic-row-/).map((node) => node.props.testID);
    expect(rows).toEqual(['topic-row-network', 'topic-row-storage']);
    expect(screen.getByText('Networking')).toBeTruthy();
  });

  it('reviews every question in the attempt', async () => {
    await render(<ResultsView attempt={attempt} set={set} onDone={() => {}} />);
    expect(screen.getAllByTestId('feedback')).toHaveLength(2);
    expect(screen.getByText('Which storage?')).toBeTruthy();
  });

  it('hides the pass verdict for a practice run', async () => {
    await render(<ResultsView attempt={{ ...attempt, mode: 'practice' }} set={set} onDone={() => {}} />);
    expect(screen.queryByText(/Did not pass/)).toBeNull();
  });

  it('warns when the set has changed since the attempt', async () => {
    await render(
      <ResultsView attempt={{ ...attempt, setVersion: '0.9.0' }} set={set} onDone={() => {}} />,
    );
    expect(screen.getByTestId('version-warning')).toBeTruthy();
  });
});
