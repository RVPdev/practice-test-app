import { afterEach, describe, expect, it } from '@jest/globals';
import { cleanup, fireEvent, waitFor } from '@testing-library/react-native';
import LibraryScreen from '../../app/(tabs)/index';
import ImportScreen from '../../app/import';
import NewSetScreen from '../../app/builder/new';
import SetDetailScreen from '../../app/set/[setId]';
import { resolveRunConfig } from '@/core/config';
import type { QuestionSet } from '@/core/schema';
import { startSession } from '@/core/session';
import { randomSeed } from '@/core/shuffle';
import { createTestRepository, renderAppRoute } from '../helpers/renderRoute';

afterEach(() => {
  cleanup();
});

const routes = {
  index: LibraryScreen,
  import: ImportScreen,
  'builder/new': NewSetScreen,
  'set/[setId]': SetDetailScreen,
};

const set: QuestionSet = {
  schemaVersion: 1,
  id: 'set-1',
  title: 'Networking Basics',
  description: 'A sample set',
  topics: [{ id: 'vpc', name: 'Networking' }],
  exam: { questionCount: 1, timeLimitMinutes: 30, passingScore: 80 },
  questions: [{ id: 'q-1', type: 'boolean', topicId: 'vpc', prompt: 'True?', answer: true }],
};

describe('Library screen (app/(tabs)/index.tsx)', () => {
  it('lists the seeded bundled set once ready', async () => {
    const repository = createTestRepository();
    const view = await renderAppRoute(repository, routes, { initialUrl: '/' });

    await waitFor(() =>
      expect(view.getByTestId('set-card-comptia-a-plus-core-1-220-1201')).toBeTruthy(),
    );
  });

  it('navigates to the builder when "Create a set" is pressed', async () => {
    const repository = createTestRepository();
    const view = await renderAppRoute(repository, routes, { initialUrl: '/' });
    await waitFor(() => expect(view.getByTestId('create-button')).toBeTruthy());

    await fireEvent.press(view.getByTestId('create-button'));

    await waitFor(() => expect(view.getPathname()).toBe('/builder/new'));
  });

  it('navigates to the import screen when "Import a set" is pressed', async () => {
    const repository = createTestRepository();
    const view = await renderAppRoute(repository, routes, { initialUrl: '/' });
    await waitFor(() => expect(view.getByTestId('import-button')).toBeTruthy());

    await fireEvent.press(view.getByTestId('import-button'));

    await waitFor(() => expect(view.getPathname()).toBe('/import'));
  });

  it('navigates to a set detail screen when its card is pressed', async () => {
    const repository = createTestRepository();
    await repository.saveSet(set, 'imported');
    const view = await renderAppRoute(repository, routes, { initialUrl: '/' });
    await waitFor(() => expect(view.getByTestId(`set-card-${set.id}`)).toBeTruthy());

    await fireEvent.press(view.getByTestId(`set-card-${set.id}`));

    await waitFor(() => expect(view.getPathname()).toBe(`/set/${set.id}`));
  });

  it('shows a resume banner for an in-progress attempt and discards it on confirmation', async () => {
    const repository = createTestRepository();
    await repository.saveSet(set, 'imported');
    const config = resolveRunConfig(set, 'practice', {}, randomSeed());
    const session = startSession(set, 'practice', config, Date.now());
    await repository.saveInProgress(session);

    const view = await renderAppRoute(repository, routes, { initialUrl: '/' });
    await waitFor(() => expect(view.getByTestId('resume-banner')).toBeTruthy());

    await fireEvent.press(view.getByTestId('discard-session'));
    await waitFor(() => expect(view.getByTestId('confirm-dialog')).toBeTruthy());

    await fireEvent.press(view.getByTestId('confirm-button-discard'));

    await waitFor(() => expect(view.queryByTestId('resume-banner')).toBeNull());
  });
});
