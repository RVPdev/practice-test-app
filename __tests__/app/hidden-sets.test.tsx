import { afterEach, describe, expect, it } from '@jest/globals';
import { cleanup, fireEvent, waitFor } from '@testing-library/react-native';
import HiddenSetsScreen from '../../app/hidden-sets';
import type { QuestionSet } from '@/core/schema';
import { createTestRepository, renderAppRoute } from '../helpers/renderRoute';

afterEach(() => {
  cleanup();
});

const routes = { 'hidden-sets': HiddenSetsScreen };

const makeSet = (over: Partial<QuestionSet> = {}): QuestionSet =>
  ({
    schemaVersion: 1,
    id: 'bundled-1',
    title: 'Bundled Exam',
    topics: [],
    exam: { questionCount: 1, timeLimitMinutes: null, passingScore: 70 },
    questions: [{ id: 'q-1', type: 'boolean', prompt: 'True?', answer: true }],
    ...over,
  }) as QuestionSet;

describe('Hidden exams screen (app/hidden-sets.tsx)', () => {
  it('shows an empty state with no hidden sets', async () => {
    const repository = createTestRepository();
    const view = await renderAppRoute(repository, routes, { initialUrl: '/hidden-sets' });
    await waitFor(() => expect(view.getByText('No hidden exams.')).toBeTruthy());
  });

  it('lists a hidden set and removes it from the list after Restore is pressed', async () => {
    const repository = createTestRepository();
    await repository.saveSet(makeSet(), 'bundled');
    await repository.hideBundledSet('bundled-1');

    const view = await renderAppRoute(repository, routes, { initialUrl: '/hidden-sets' });
    await waitFor(() => expect(view.getByText('Bundled Exam')).toBeTruthy());

    await fireEvent.press(view.getByTestId('restore-set-bundled-1'));

    await waitFor(() => expect(view.queryByText('Bundled Exam')).toBeNull());
    const sets = await repository.listSets();
    expect(sets.find((s) => s.id === 'bundled-1')).toBeTruthy();
  });
});
