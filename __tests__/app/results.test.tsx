import { afterEach, describe, expect, it } from '@jest/globals';
import { act } from 'react';
import { cleanup, fireEvent, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import LibraryScreen from '../../app/(tabs)/index';
import ResultsScreen from '../../app/results/[attemptId]';
import type { QuestionSet } from '@/core/schema';
import type { Attempt } from '@/core/types';
import { createTestRepository, renderAppRoute } from '../helpers/renderRoute';

afterEach(() => {
  cleanup();
});

const routes = { index: LibraryScreen, 'results/[attemptId]': ResultsScreen };

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

describe('Results screen (app/results/[attemptId].tsx)', () => {
  it('shows the score once the attempt and its set load', async () => {
    const repository = createTestRepository();
    await repository.saveSet(set, 'imported');
    await repository.saveAttempt(attempt);

    const view = await renderAppRoute(repository, routes, { initialUrl: '/results/att-1' });

    await waitFor(() => expect(view.getByText('1 of 1 correct')).toBeTruthy());
  });

  it('shows a "no longer available" message for an unknown attempt id', async () => {
    const repository = createTestRepository();

    const view = await renderAppRoute(repository, routes, { initialUrl: '/results/missing' });

    await waitFor(() =>
      expect(view.getByText('This result is no longer available.')).toBeTruthy(),
    );
    expect(view.getByTestId('results-missing-done')).toBeTruthy();
  });

  it('dismisses back to the library when "Done" is pressed', async () => {
    const repository = createTestRepository();
    await repository.saveSet(set, 'imported');
    await repository.saveAttempt(attempt);
    // Start at the library root, then push to results - same as the real
    // app reaching this screen from a finished session - so dismissAll()
    // has somewhere to land.
    const view = await renderAppRoute(repository, routes, { initialUrl: '/' });
    await waitFor(() => expect(view.getByTestId('set-card-set-1')).toBeTruthy());
    await act(async () => {
      router.push('/results/att-1');
    });
    await waitFor(() => expect(view.getByTestId('results-done')).toBeTruthy());

    await fireEvent.press(view.getByTestId('results-done'));

    await waitFor(() => expect(view.getPathname()).toBe('/'));
  });
});
