import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react-native';
import type { Attempt } from '@/core/types';
import { HistoryView } from './HistoryView';

const attempt = (over: Partial<Attempt> = {}): Attempt => ({
  id: 'att_1',
  setId: 'set-1',
  setVersion: null,
  mode: 'mock',
  startedAt: '2026-09-06T14:00:00.000Z',
  finishedAt: '2026-09-06T14:20:00.000Z',
  config: {
    questionCount: 2,
    timeLimitMinutes: null,
    passingScore: 70,
    shuffleQuestions: true,
    shuffleOptions: true,
    seed: 1,
  },
  score: { correct: 1, total: 2, percent: 50, passed: false },
  byTopic: [],
  answers: [],
  ...over,
});

const titles = { 'set-1': 'Cloud Basics' };

describe('HistoryView', () => {
  it('shows each attempt with its set title, mode and score', async () => {
    await render(
      <HistoryView attempts={[attempt()]} setTitles={titles} loading={false} onOpenAttempt={() => {}} />,
    );
    expect(screen.getByText('Cloud Basics')).toBeTruthy();
    expect(screen.getByText(/Mock test/)).toBeTruthy();
    expect(screen.getByText(/50%/)).toBeTruthy();
  });

  it('falls back to the set id when the set has been deleted', async () => {
    await render(
      <HistoryView attempts={[attempt({ setId: 'gone' })]} setTitles={titles} loading={false} onOpenAttempt={() => {}} />,
    );
    expect(screen.getByText('gone')).toBeTruthy();
  });

  it('opens an attempt when its row is tapped', async () => {
    const onOpenAttempt = jest.fn();
    await render(
      <HistoryView attempts={[attempt()]} setTitles={titles} loading={false} onOpenAttempt={onOpenAttempt} />,
    );
    await fireEvent.press(screen.getByTestId('history-att_1'));
    expect(onOpenAttempt).toHaveBeenCalledWith('att_1');
  });

  it('shows an empty state when nothing has been attempted', async () => {
    await render(<HistoryView attempts={[]} setTitles={{}} loading={false} onOpenAttempt={() => {}} />);
    expect(screen.getByText(/No attempts yet/)).toBeTruthy();
  });
});
