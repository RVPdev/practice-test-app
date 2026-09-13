import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { act } from 'react';
import { cleanup, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert, Text } from 'react-native';
import SessionScreen from '../../app/session/[attemptId]';
import { resolveRunConfig } from '@/core/config';
import type { QuestionSet } from '@/core/schema';
import { startSession } from '@/core/session';
import { randomSeed } from '@/core/shuffle';
import type { RunMode } from '@/core/types';
import { createTestRepository, renderAppRoute } from '../helpers/renderRoute';

afterEach(() => {
  cleanup();
  // jest.spyOn(Alert, 'alert') re-wraps the same spy across tests in this
  // file rather than creating a fresh one, so an unrestored spy's
  // `mock.calls` leaks earlier tests' calls (and their now-stale closures)
  // into later ones.
  jest.restoreAllMocks();
});

// Stubbed: the results screen's own rendering is exercised in its own test
// file - here we only need to confirm a finished session reaches that path.
function StubResultsScreen() {
  return <Text>stub results screen</Text>;
}

const routes = {
  'session/[attemptId]': SessionScreen,
  'results/[attemptId]': StubResultsScreen,
};

const set: QuestionSet = {
  schemaVersion: 1,
  id: 'set-1',
  title: 'Networking Basics',
  questions: [{ id: 'q-1', type: 'boolean', prompt: 'True?', answer: true }],
};

async function start(repository: ReturnType<typeof createTestRepository>, mode: RunMode) {
  await repository.saveSet(set, 'imported');
  const config = resolveRunConfig(set, mode, {}, randomSeed());
  const session = startSession(set, mode, config, Date.now());
  await repository.saveInProgress(session);
  // renderRouter forces jest.useFakeTimers(), but useSessionRunner's 1s
  // countdown setInterval combined with that makes RNTL's fake-timer-aware
  // waitFor/act spin forever (observed: OOM) - switch back to real timers
  // right after mount, before any waitFor/fireEvent call.
  const view = await renderAppRoute(repository, routes, {
    initialUrl: `/session/${session.attemptId}`,
  });
  jest.useRealTimers();
  return { view, attemptId: session.attemptId };
}

describe('Session screen, practice mode (app/session/[attemptId].tsx)', () => {
  it('answers, reveals, and finishes straight to results (no confirmation)', async () => {
    const repository = createTestRepository();
    const { view, attemptId } = await start(repository, 'practice');
    await waitFor(() => expect(view.getByTestId('option-true')).toBeTruthy());

    await fireEvent.press(view.getByTestId('option-true'));
    await fireEvent.press(view.getByTestId('reveal'));
    await waitFor(() => expect(view.getByTestId('finish')).toBeTruthy());

    await fireEvent.press(view.getByTestId('finish'));

    await waitFor(() => expect(view.getPathname()).toBe(`/results/${attemptId}`));
    const attempt = await repository.getAttempt(attemptId);
    expect(attempt?.score.correct).toBe(1);
    expect(await repository.getInProgress()).toBeNull();
  });
});

describe('Session screen, mock mode (app/session/[attemptId].tsx)', () => {
  it('warns about unanswered questions before submitting, then finishes on confirmation', async () => {
    const repository = createTestRepository();
    const { view, attemptId } = await start(repository, 'mock');
    await waitFor(() => expect(view.getByTestId('submit-test')).toBeTruthy());

    const alertSpy = jest.spyOn(Alert, 'alert');
    await fireEvent.press(view.getByTestId('submit-test'));

    expect(alertSpy).toHaveBeenCalledWith(
      'Submit the test?',
      expect.stringContaining('1 question(s) are unanswered'),
      expect.anything(),
    );
    const confirm = alertSpy.mock.calls[0][2]?.find((button) => button.text === 'Submit');
    await act(async () => {
      await confirm?.onPress?.(undefined as never);
    });

    await waitFor(() => expect(view.getPathname()).toBe(`/results/${attemptId}`));
  });

  it('submits without confirmation wording about unanswered questions once everything is answered', async () => {
    const repository = createTestRepository();
    const { view, attemptId } = await start(repository, 'mock');
    await waitFor(() => expect(view.getByTestId('option-true')).toBeTruthy());
    await fireEvent.press(view.getByTestId('option-true'));

    const alertSpy = jest.spyOn(Alert, 'alert');
    await fireEvent.press(view.getByTestId('submit-test'));

    expect(alertSpy).toHaveBeenCalledWith(
      'Submit the test?',
      'You have answered every question.',
      expect.anything(),
    );
    const confirm = alertSpy.mock.calls[0][2]?.find((button) => button.text === 'Submit');
    await act(async () => {
      await confirm?.onPress?.(undefined as never);
    });

    await waitFor(() => expect(view.getPathname()).toBe(`/results/${attemptId}`));
  });
});
