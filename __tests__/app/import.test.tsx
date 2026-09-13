import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { act } from 'react';
import { cleanup, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import LibraryScreen from '../../app/(tabs)/index';
import ImportScreen from '../../app/import';
import type { QuestionSet } from '@/core/schema';
import { createTestRepository, renderAppRoute } from '../helpers/renderRoute';

let mockFileContents = '';

jest.mock('expo-file-system', () => ({
  File: class {
    text() {
      return Promise.resolve(mockFileContents);
    }
  },
}));

jest.mock('expo-document-picker', () => ({
  getDocumentAsync: jest.fn(),
}));

afterEach(() => {
  cleanup();
});

const routes = { index: LibraryScreen, import: ImportScreen };

const validSet: QuestionSet = {
  schemaVersion: 1,
  id: 'imported-set',
  title: 'An Imported Set',
  questions: [{ id: 'q-1', type: 'boolean', prompt: 'True?', answer: true }],
};

function mockPicked(text: string) {
  mockFileContents = text;
  (DocumentPicker.getDocumentAsync as jest.MockedFunction<typeof DocumentPicker.getDocumentAsync>).mockResolvedValue({
    canceled: false,
    assets: [
      {
        uri: 'file://picked.json',
        name: 'picked.json',
        size: text.length,
        mimeType: 'application/json',
        lastModified: Date.now(),
      },
    ],
  });
}

function mockCancelled() {
  (DocumentPicker.getDocumentAsync as jest.MockedFunction<typeof DocumentPicker.getDocumentAsync>).mockResolvedValue({ canceled: true, assets: null });
}

describe('Import screen (app/import.tsx)', () => {
  it('imports a new, valid set and shows success', async () => {
    mockPicked(JSON.stringify(validSet));
    const repository = createTestRepository();
    const view = await renderAppRoute(repository, routes, { initialUrl: '/import' });
    await waitFor(() => expect(view.getByTestId('pick-file')).toBeTruthy());

    await fireEvent.press(view.getByTestId('pick-file'));

    await waitFor(() => expect(view.getByTestId('import-success')).toBeTruthy());
    expect(view.getByText('Imported "An Imported Set".')).toBeTruthy();
    const saved = await repository.getSet('imported-set');
    expect(saved?.title).toBe('An Imported Set');
  });

  it('shows validation errors for an invalid file and saves nothing', async () => {
    mockPicked(JSON.stringify({ schemaVersion: 1 }));
    const repository = createTestRepository();
    const view = await renderAppRoute(repository, routes, { initialUrl: '/import' });
    await waitFor(() => expect(view.getByTestId('pick-file')).toBeTruthy());

    await fireEvent.press(view.getByTestId('pick-file'));

    await waitFor(() => expect(view.getByTestId('import-errors')).toBeTruthy());
    expect(view.queryByTestId('import-success')).toBeNull();
  });

  it('does nothing when the picker is cancelled', async () => {
    mockCancelled();
    const repository = createTestRepository();
    const view = await renderAppRoute(repository, routes, { initialUrl: '/import' });
    await waitFor(() => expect(view.getByTestId('pick-file')).toBeTruthy());

    await fireEvent.press(view.getByTestId('pick-file'));

    await waitFor(() => expect(view.getByTestId('pick-file')).toBeTruthy());
    expect(view.queryByTestId('import-errors')).toBeNull();
    expect(view.queryByTestId('import-success')).toBeNull();
  });

  it('offers Replace/Import as copy for a duplicate id, and replaces on confirmation', async () => {
    const repository = createTestRepository();
    await repository.saveSet({ ...validSet, title: 'Original Title' }, 'imported');
    mockPicked(JSON.stringify({ ...validSet, title: 'Replacement Title' }));
    const view = await renderAppRoute(repository, routes, { initialUrl: '/import' });
    await waitFor(() => expect(view.getByTestId('pick-file')).toBeTruthy());

    const alertSpy = jest.spyOn(Alert, 'alert');
    await fireEvent.press(view.getByTestId('pick-file'));

    await waitFor(() => expect(alertSpy).toHaveBeenCalled());
    const replace = alertSpy.mock.calls[0][2]?.find((button) => button.text === 'Replace');
    await act(async () => {
      await replace?.onPress?.(undefined as never);
    });

    await waitFor(async () => {
      const updated = await repository.getSet('imported-set');
      expect(updated?.title).toBe('Replacement Title');
    });
  });

  it('navigates back to the library when "Done" is pressed after a successful import', async () => {
    mockPicked(JSON.stringify(validSet));
    const repository = createTestRepository();
    const view = await renderAppRoute(repository, routes, { initialUrl: '/' });
    await waitFor(() => expect(view.getByTestId('import-button')).toBeTruthy());
    await fireEvent.press(view.getByTestId('import-button'));
    await waitFor(() => expect(view.getByTestId('pick-file')).toBeTruthy());
    await fireEvent.press(view.getByTestId('pick-file'));
    await waitFor(() => expect(view.getByTestId('import-done')).toBeTruthy());

    await fireEvent.press(view.getByTestId('import-done'));

    await waitFor(() => expect(view.getPathname()).toBe('/'));
  });
});
