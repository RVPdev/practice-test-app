import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { cleanup, fireEvent, waitFor } from '@testing-library/react-native';
import { Text } from 'react-native';
import SessionScreen from '../../app/session/[attemptId]';
import { resolveRunConfig } from '@/core/config';
import type { QuestionSet } from '@/core/schema';
import { startSession } from '@/core/session';
import { randomSeed } from '@/core/shuffle';
import type { RunMode } from '@/core/types';
import { createTestRepository, renderAppRoute } from '../helpers/renderRoute';

afterEach(() => {
  cleanup();
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

    await fireEvent.press(view.getByTestId('submit-test'));

    await waitFor(() => expect(view.getByTestId('confirm-dialog')).toBeTruthy());
    expect(view.getByText('Submit the test?')).toBeTruthy();
    expect(view.getByText('1 question(s) are unanswered and will be marked incorrect.')).toBeTruthy();

    await fireEvent.press(view.getByTestId('confirm-button-submit'));

    await waitFor(() => expect(view.getPathname()).toBe(`/results/${attemptId}`));
  });

  it('submits without confirmation wording about unanswered questions once everything is answered', async () => {
    const repository = createTestRepository();
    const { view, attemptId } = await start(repository, 'mock');
    await waitFor(() => expect(view.getByTestId('option-true')).toBeTruthy());
    await fireEvent.press(view.getByTestId('option-true'));

    await fireEvent.press(view.getByTestId('submit-test'));

    await waitFor(() => expect(view.getByTestId('confirm-dialog')).toBeTruthy());
    expect(view.getByText('Submit the test?')).toBeTruthy();
    expect(view.getByText('You have answered every question.')).toBeTruthy();

    await fireEvent.press(view.getByTestId('confirm-button-submit'));

    await waitFor(() => expect(view.getPathname()).toBe(`/results/${attemptId}`));
  });
});
