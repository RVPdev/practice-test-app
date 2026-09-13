import { afterEach, describe, expect, it } from '@jest/globals';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Text } from 'react-native';
import { RepositoryProvider } from '@/data/RepositoryProvider';
import { createMemoryKv } from '@/data/kv';
import { createStorageRepository } from '@/data/storage';
import { ConsentGate } from './ConsentGate';

afterEach(() => {
  cleanup();
});

describe('ConsentGate', () => {
  it('shows the welcome screen instead of children when terms have not been accepted', async () => {
    const repository = createStorageRepository(createMemoryKv());
    await render(
      <RepositoryProvider repository={repository}>
        <ConsentGate>
          <Text testID="app-content">real app</Text>
        </ConsentGate>
      </RepositoryProvider>,
    );

    await waitFor(() => expect(screen.getByTestId('consent-continue')).toBeTruthy());
    expect(screen.queryByTestId('app-content')).toBeNull();
  });

  it('shows the real children directly when terms were already accepted', async () => {
    const repository = createStorageRepository(createMemoryKv());
    await repository.acceptTerms();
    await render(
      <RepositoryProvider repository={repository}>
        <ConsentGate>
          <Text testID="app-content">real app</Text>
        </ConsentGate>
      </RepositoryProvider>,
    );

    await waitFor(() => expect(screen.getByTestId('app-content')).toBeTruthy());
    expect(screen.queryByTestId('consent-continue')).toBeNull();
  });

  it('persists acceptance and reveals children once the user accepts', async () => {
    const repository = createStorageRepository(createMemoryKv());
    await render(
      <RepositoryProvider repository={repository}>
        <ConsentGate>
          <Text testID="app-content">real app</Text>
        </ConsentGate>
      </RepositoryProvider>,
    );
    await waitFor(() => expect(screen.getByTestId('consent-toggle')).toBeTruthy());

    await fireEvent(screen.getByTestId('consent-toggle'), 'valueChange', true);
    await fireEvent.press(screen.getByTestId('consent-continue'));

    await waitFor(() => expect(screen.getByTestId('app-content')).toBeTruthy());
    expect(await repository.getTermsAccepted()).toBe(true);
  });
});
