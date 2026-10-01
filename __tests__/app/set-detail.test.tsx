import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { cleanup, fireEvent, waitFor } from '@testing-library/react-native';
import { Text } from 'react-native';
import LibraryScreen from '../../app/(tabs)/index';
import SetDetailScreen from '../../app/set/[setId]';
import EditSetScreen from '../../app/builder/[setId]';
import type { QuestionSet } from '@/core/schema';
import { exportSet } from '@/data/exportSet';
import { createTestRepository, renderAppRoute } from '../helpers/renderRoute';

jest.mock('@/data/exportSet', () => ({
  exportSet: jest.fn<() => Promise<void>>(() => Promise.resolve()),
}));

afterEach(() => {
  cleanup();
});

// Stubbed: the real session screen's timer/runner logic is exercised in its own
// test file - here we only need to confirm navigation *reaches* that path.
function StubSessionScreen() {
  return <Text>stub session screen</Text>;
}

const routes = {
  index: LibraryScreen,
  'set/[setId]': SetDetailScreen,
  'builder/[setId]': EditSetScreen,
  'session/[attemptId]': StubSessionScreen,
};

const makeSet = (over: Partial<QuestionSet> = {}): QuestionSet =>
  ({
    schemaVersion: 1,
    id: 'set-1',
    title: 'Networking Basics',
    description: 'A sample set',
    topics: [{ id: 'vpc', name: 'Networking' }],
    exam: { questionCount: 1, timeLimitMinutes: 30, passingScore: 80 },
    questions: [{ id: 'q-1', type: 'boolean', topicId: 'vpc', prompt: 'True?', answer: true }],
    ...over,
  }) as QuestionSet;

describe('Set detail screen (app/set/[setId].tsx)', () => {
  it('shows the set once loaded', async () => {
    const repository = createTestRepository();
    await repository.saveSet(makeSet(), 'imported');
    const view = await renderAppRoute(repository, routes, { initialUrl: '/set/set-1' });

    await waitFor(() => expect(view.getByText('Networking Basics')).toBeTruthy());
  });

  // A stale/bad set id (e.g. a bookmark to a since-deleted or never-existing set)
  // resolves the fetch to null, same as "still loading" - without distinguishing
  // the two, this screen got stuck on "Loading…" forever with no way out.
  it('redirects home for a set id that does not exist', async () => {
    const repository = createTestRepository();
    const view = await renderAppRoute(repository, routes, { initialUrl: '/set/no-such-set' });

    await waitFor(() => expect(view.getPathname()).toBe('/'));
  });

  it('shows edit/export/delete for an imported set', async () => {
    const repository = createTestRepository();
    await repository.saveSet(makeSet({ id: 'imported-1', title: 'Imported' }), 'imported');

    const view = await renderAppRoute(repository, routes, { initialUrl: '/set/imported-1' });

    await waitFor(() => expect(view.getByTestId('edit-set')).toBeTruthy());
    expect(view.getByTestId('export-set')).toBeTruthy();
    expect(view.getByTestId('delete-set')).toBeTruthy();
  });

  it('hides edit/export but shows the delete (hide) action for a bundled set', async () => {
    const repository = createTestRepository();
    await repository.saveSet(makeSet({ id: 'bundled-1', title: 'Bundled' }), 'bundled');

    const view = await renderAppRoute(repository, routes, { initialUrl: '/set/bundled-1' });

    await waitFor(() => expect(view.getByText('Bundled')).toBeTruthy());
    expect(view.queryByTestId('edit-set')).toBeNull();
    expect(view.queryByTestId('export-set')).toBeNull();
    expect(view.getByTestId('delete-set')).toBeTruthy();
  });

  it('starts a mock session and navigates to it', async () => {
    const repository = createTestRepository();
    await repository.saveSet(makeSet(), 'imported');
    const view = await renderAppRoute(repository, routes, { initialUrl: '/set/set-1' });
    await waitFor(() => expect(view.getByTestId('start-mock')).toBeTruthy());

    await fireEvent.press(view.getByTestId('start-mock'));

    await waitFor(() => expect(view.getPathname()).toMatch(/^\/session\//));
    const inProgress = await repository.getInProgress();
    expect(inProgress?.setId).toBe('set-1');
  });

  it('navigates to the builder when "Edit this set" is pressed', async () => {
    const repository = createTestRepository();
    await repository.saveSet(makeSet(), 'imported');
    const view = await renderAppRoute(repository, routes, { initialUrl: '/set/set-1' });
    await waitFor(() => expect(view.getByTestId('edit-set')).toBeTruthy());

    await fireEvent.press(view.getByTestId('edit-set'));

    await waitFor(() => expect(view.getPathname()).toBe('/builder/set-1'));
  });

  it('exports the set with its real source when "Export this set" is pressed', async () => {
    const repository = createTestRepository();
    const set = makeSet();
    await repository.saveSet(set, 'imported');
    const view = await renderAppRoute(repository, routes, { initialUrl: '/set/set-1' });
    await waitFor(() => expect(view.getByTestId('export-set')).toBeTruthy());

    await fireEvent.press(view.getByTestId('export-set'));

    await waitFor(() => expect(exportSet).toHaveBeenCalledWith(set, 'imported'));
  });

  it('deletes the set after confirmation and navigates back', async () => {
    const repository = createTestRepository();
    await repository.saveSet(makeSet(), 'imported');
    // Reach the screen via a real push (not a direct initialUrl) so there is
    // a screen in history for the post-delete router.back() to land on.
    const view = await renderAppRoute(repository, routes, { initialUrl: '/' });
    await waitFor(() => expect(view.getByTestId('set-card-set-1')).toBeTruthy());
    await fireEvent.press(view.getByTestId('set-card-set-1'));
    await waitFor(() => expect(view.getByTestId('delete-set')).toBeTruthy());

    await fireEvent.press(view.getByTestId('delete-set'));
    await waitFor(() => expect(view.getByTestId('confirm-dialog')).toBeTruthy());

    await fireEvent.press(view.getByTestId('confirm-button-delete'));

    expect(await repository.getSet('set-1')).toBeNull();
    await waitFor(() => expect(view.getPathname()).toBe('/'));
  });

  it('hides a bundled set after confirmation, keeping its history, and it reappears via restore', async () => {
    const repository = createTestRepository();
    await repository.saveSet(makeSet({ id: 'bundled-1', title: 'Bundled' }), 'bundled');
    await repository.saveAttempt({
      id: 'att_1',
      setId: 'bundled-1',
      setVersion: '1.0.0',
      mode: 'practice',
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
      byTopic: [{ topicId: 'vpc', correct: 1, total: 1 }],
      answers: [{ questionId: 'q-1', response: [], correct: true, timeMs: 1000 }],
    });

    const view = await renderAppRoute(repository, routes, { initialUrl: '/' });
    await waitFor(() => expect(view.getByTestId('set-card-bundled-1')).toBeTruthy());
    await fireEvent.press(view.getByTestId('set-card-bundled-1'));
    await waitFor(() => expect(view.getByTestId('delete-set')).toBeTruthy());

    await fireEvent.press(view.getByTestId('delete-set'));
    await waitFor(() => expect(view.getByTestId('confirm-dialog')).toBeTruthy());
    await fireEvent.press(view.getByTestId('confirm-button-remove'));

    await waitFor(() => expect(view.getPathname()).toBe('/'));
    const visible = await repository.listSets();
    expect(visible.find((s) => s.id === 'bundled-1')).toBeUndefined();
    const hidden = await repository.listHiddenSets();
    expect(hidden.find((s) => s.id === 'bundled-1')).toBeTruthy();
    expect(await repository.listAttempts('bundled-1')).toHaveLength(1);

    await repository.restoreBundledSet('bundled-1');
    expect((await repository.listSets()).find((s) => s.id === 'bundled-1')).toBeTruthy();
  });
});
