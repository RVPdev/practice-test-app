import { describe, expect, it } from '@jest/globals';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { resolveRunConfig } from '@/core/config';
import type { QuestionSet } from '@/core/schema';
import { startSession } from '@/core/session';
import { RepositoryProvider } from '@/data/RepositoryProvider';
import { createMemoryKv } from '@/data/kv';
import { createStorageRepository } from '@/data/storage';
import { useSessionRunner } from './useSessionRunner';

const set: QuestionSet = {
  schemaVersion: 1,
  id: 'set-1',
  title: 'Set One',
  questions: [
    { id: 'q-1', type: 'boolean', prompt: 'True?', answer: true, explanation: 'Yes.' },
    { id: 'q-2', type: 'boolean', prompt: 'Also true?', answer: true, explanation: 'Yes.' },
  ],
};

async function harness() {
  const repository = createStorageRepository(createMemoryKv());
  await repository.saveSet(set, 'imported');
  const config = resolveRunConfig(set, 'practice', undefined, 7);
  const session = startSession(set, 'practice', config, Date.now());
  await repository.saveInProgress(session);

  const wrapper = ({ children }: { children: ReactNode }) => (
    <RepositoryProvider repository={repository}>{children}</RepositoryProvider>
  );
  return { repository, session, wrapper };
}

describe('useSessionRunner', () => {
  it('loads the in-progress session and its set', async () => {
    const { wrapper } = await harness();
    const { result } = await renderHook(() => useSessionRunner(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.state?.setId).toBe('set-1');
    expect(result.current.question?.id).toBeDefined();
  });

  it('persists every answer so the session survives a relaunch', async () => {
    const { repository, wrapper } = await harness();
    const { result } = await renderHook(() => useSessionRunner(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    const questionId = result.current.question!.id;
    await act(async () => result.current.answer(['true']));

    await waitFor(async () => {
      const saved = await repository.getInProgress();
      expect(saved?.answers[questionId]).toEqual(['true']);
    });
  });

  it('saves an attempt and clears the in-progress session on submit', async () => {
    const { repository, wrapper } = await harness();
    const { result } = await renderHook(() => useSessionRunner(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => result.current.answer(['true']));
    await act(async () => result.current.submit());

    await waitFor(async () => {
      expect(await repository.getInProgress()).toBeNull();
    });
    const attempts = await repository.listAttempts('set-1');
    expect(attempts).toHaveLength(1);
    expect(attempts[0].answers).toHaveLength(2);
  });

  // The results screen navigates on this id and immediately reads the attempt back, so
  // the id must not appear until the write has actually landed.
  it('reports a finished attempt id only once the attempt is readable', async () => {
    const { repository, wrapper } = await harness();
    const { result } = await renderHook(() => useSessionRunner(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.finishedAttemptId).toBeNull();

    await act(async () => result.current.answer(['true']));
    await act(async () => result.current.submit());

    await waitFor(() => expect(result.current.finishedAttemptId).not.toBeNull());
    const saved = await repository.getAttempt(result.current.finishedAttemptId!);
    expect(saved).not.toBeNull();
    expect(await repository.getInProgress()).toBeNull();
  });
});
