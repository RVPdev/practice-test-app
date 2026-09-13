import { afterEach, describe, expect, it } from '@jest/globals';
import { cleanup, fireEvent, waitFor } from '@testing-library/react-native';
import { Text } from 'react-native';
import HistoryScreen from '../../app/(tabs)/history';
import type { QuestionSet } from '@/core/schema';
import type { Attempt } from '@/core/types';
import { createTestRepository, renderAppRoute } from '../helpers/renderRoute';

afterEach(() => {
  cleanup();
});

function StubResultsScreen() {
  return <Text>stub results screen</Text>;
}

const routes = { history: HistoryScreen, 'results/[attemptId]': StubResultsScreen };

const set: QuestionSet = {
  schemaVersion: 1,
  id: 'set-1',
  title: 'Networking Basics',
  questions: [{ id: 'q-1', type: 'boolean', prompt: 'True?', answer: true }],
};

const attempt: Attempt = {
  id: 'att-1',
  setId: 'set-1',
  setVersion: null,
  mode: 'mock',
  startedAt: '2026-09-06T14:00:00.000Z',
  finishedAt: '2026-09-06T14:30:00.000Z',
  config: {
    questionCount: 1,
    timeLimitMinutes: null,
    passingScore: 70,
    shuffleQuestions: true,
    shuffleOptions: true,
    seed: 1,
  },
  score: { correct: 1, total: 1, percent: 100, passed: true },
  byTopic: [],
  answers: [{ questionId: 'q-1', response: ['true'], correct: true, timeMs: 1000 }],
};

describe('History screen (app/(tabs)/history.tsx)', () => {
  it('lists past attempts with their set title', async () => {
    const repository = createTestRepository();
    await repository.saveSet(set, 'imported');
    await repository.saveAttempt(attempt);

    const view = await renderAppRoute(repository, routes, { initialUrl: '/history' });

    await waitFor(() => expect(view.getByTestId(`history-${attempt.id}`)).toBeTruthy());
    expect(view.getByText('Networking Basics')).toBeTruthy();
  });

  it('navigates to the results screen when an attempt is pressed', async () => {
    const repository = createTestRepository();
    await repository.saveSet(set, 'imported');
    await repository.saveAttempt(attempt);
    const view = await renderAppRoute(repository, routes, { initialUrl: '/history' });
    await waitFor(() => expect(view.getByTestId(`history-${attempt.id}`)).toBeTruthy());

    await fireEvent.press(view.getByTestId(`history-${attempt.id}`));

    await waitFor(() => expect(view.getPathname()).toBe(`/results/${attempt.id}`));
  });

  it('shows nothing but the loading state when there are no attempts yet', async () => {
    const repository = createTestRepository();
    const view = await renderAppRoute(repository, routes, { initialUrl: '/history' });

    await waitFor(() => expect(view.queryByTestId('history-loading')).toBeNull());
    expect(view.queryByTestId(`history-${attempt.id}`)).toBeNull();
  });
});
