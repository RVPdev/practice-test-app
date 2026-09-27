import { afterEach, describe, expect, it } from '@jest/globals';
import { cleanup, waitFor } from '@testing-library/react-native';
import LibraryScreen from '../../app/(tabs)/index';
import NotFoundScreen from '../../app/+not-found';
import { createTestRepository, renderAppRoute } from '../helpers/renderRoute';

afterEach(() => {
  cleanup();
});

const routes = {
  index: LibraryScreen,
  '+not-found': NotFoundScreen,
};

// A stale bookmark or shared link from before a URL-structure change (e.g. the
// pre-/app/ deep links) has no matching route - it should land the visitor
// back home rather than on expo-router's generic "Unmatched Route" screen.
describe('+not-found route', () => {
  it('redirects an unmatched path to the Library', async () => {
    const repository = createTestRepository();
    const view = await renderAppRoute(repository, routes, { initialUrl: '/set/stale-bookmarked-id' });

    await waitFor(() => expect(view.getPathname()).toBe('/'));
    await waitFor(() => expect(view.getByTestId('set-card-comptia-a-plus-core-1-220-1201')).toBeTruthy());
  });
});
