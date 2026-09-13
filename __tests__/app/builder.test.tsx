import { afterEach, describe, expect, it } from '@jest/globals';
import { cleanup, fireEvent, waitFor } from '@testing-library/react-native';
import LibraryScreen from '../../app/(tabs)/index';
import NewSetScreen from '../../app/builder/new';
import EditSetScreen from '../../app/builder/[setId]';
import SetDetailScreen from '../../app/set/[setId]';
import type { QuestionSet } from '@/core/schema';
import { createTestRepository, renderAppRoute } from '../helpers/renderRoute';

afterEach(() => {
  cleanup();
});

const routes = {
  index: LibraryScreen,
  'builder/new': NewSetScreen,
  'builder/[setId]': EditSetScreen,
  'set/[setId]': SetDetailScreen,
};

const makeSet = (over: Partial<QuestionSet> = {}): QuestionSet =>
  ({
    schemaVersion: 1,
    id: 'set-1',
    title: 'Networking Basics',
    questions: [{ id: 'q-1', type: 'boolean', prompt: 'True?', answer: true }],
    ...over,
  }) as QuestionSet;

describe('Create set screen (app/builder/new.tsx)', () => {
  it('shows validation errors instead of saving an empty set', async () => {
    const repository = createTestRepository();
    const view = await renderAppRoute(repository, routes, { initialUrl: '/builder/new' });
    await waitFor(() => expect(view.getByTestId('builder-save')).toBeTruthy());

    await fireEvent.press(view.getByTestId('builder-save'));

    await waitFor(() => expect(view.getByTestId('builder-errors')).toBeTruthy());
    const imported = (await repository.listSets()).filter((s) => s.source === 'imported');
    expect(imported).toEqual([]);
  });

  it('saves a new set as "imported" and navigates back', async () => {
    const repository = createTestRepository();
    // Reach the screen via a real push (not a direct initialUrl) so there is
    // a screen in history for the post-save router.back() to land on.
    const view = await renderAppRoute(repository, routes, { initialUrl: '/' });
    await waitFor(() => expect(view.getByTestId('create-button')).toBeTruthy());
    await fireEvent.press(view.getByTestId('create-button'));
    await waitFor(() => expect(view.getByTestId('builder-title')).toBeTruthy());

    await fireEvent.changeText(view.getByTestId('builder-title'), 'My New Set');
    await fireEvent.press(view.getByTestId('show-add-question'));
    await fireEvent.press(view.getByTestId('add-question-boolean'));
    await fireEvent.changeText(view.getByTestId('boolean-prompt'), 'Is this a test?');
    await fireEvent.press(view.getByTestId('boolean-answer-true'));
    await fireEvent.press(view.getByText('Done'));
    await fireEvent.press(view.getByTestId('builder-save'));

    await waitFor(async () => {
      const imported = (await repository.listSets()).filter((s) => s.source === 'imported');
      expect(imported).toHaveLength(1);
    });
    const [summary] = (await repository.listSets()).filter((s) => s.source === 'imported');
    expect(summary.title).toBe('My New Set');
    await waitFor(() => expect(view.getPathname()).toBe('/'));
  });
});

describe('Edit set screen (app/builder/[setId].tsx)', () => {
  it('loads and saves changes for an imported set', async () => {
    const repository = createTestRepository();
    await repository.saveSet(makeSet(), 'imported');
    // Reach the screen via real pushes (index -> set detail -> edit) so
    // there is a screen in history for the post-save router.back() to land on.
    const view = await renderAppRoute(repository, routes, { initialUrl: '/set/set-1' });
    await waitFor(() => expect(view.getByTestId('edit-set')).toBeTruthy());
    await fireEvent.press(view.getByTestId('edit-set'));
    await waitFor(() => expect(view.getByTestId('builder-title')).toBeTruthy());

    await fireEvent.changeText(view.getByTestId('builder-title'), 'Networking Basics v2');
    await fireEvent.press(view.getByTestId('builder-save'));

    await waitFor(async () => {
      const updated = await repository.getSet('set-1');
      expect(updated?.title).toBe('Networking Basics v2');
    });
  });

  it('blocks editing a bundled set reached by direct URL (regression)', async () => {
    const repository = createTestRepository();
    await repository.saveSet(makeSet({ id: 'bundled-1' }), 'bundled');
    const view = await renderAppRoute(repository, routes, { initialUrl: '/builder/bundled-1' });

    await waitFor(() => expect(view.getByText("This set can't be edited.")).toBeTruthy());
    expect(view.queryByTestId('builder-title')).toBeNull();

    // The storage-layer guard this regression test backs up.
    await expect(repository.saveSet(makeSet({ id: 'bundled-1' }), 'imported', 'replace')).rejects.toThrow();
  });

  it('shows the blocked message (not an endless loading state) for a set id that does not exist', async () => {
    const repository = createTestRepository();
    const view = await renderAppRoute(repository, routes, { initialUrl: '/builder/does-not-exist' });

    await waitFor(() => expect(view.getByText("This set can't be edited.")).toBeTruthy());
  });
});
