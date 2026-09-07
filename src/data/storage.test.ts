import { beforeEach, describe, expect, it } from '@jest/globals';
import type { QuestionSet } from '@/core/schema';
import type { Attempt, SessionState } from '@/core/types';
import { createMemoryKv } from './kv';
import type { Repository } from './repository';
import { createStorageRepository } from './storage';

const makeSet = (over: Partial<QuestionSet> = {}): QuestionSet =>
  ({
    schemaVersion: 1,
    id: 'set-1',
    title: 'Set One',
    description: 'A set',
    version: '1.0.0',
    topics: [{ id: 'vpc', name: 'Networking' }],
    questions: [
      {
        id: 'q-1',
        type: 'single',
        topicId: 'vpc',
        prompt: 'Which?',
        options: [
          { id: 'a', text: 'A', correct: true },
          { id: 'b', text: 'B', correct: false },
        ],
      },
    ],
    ...over,
  }) as QuestionSet;

const makeAttempt = (over: Partial<Attempt> = {}): Attempt => ({
  id: 'att_1',
  setId: 'set-1',
  setVersion: '1.0.0',
  mode: 'mock',
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
  answers: [{ questionId: 'q-1', response: ['a'], correct: true, timeMs: 1000 }],
  ...over,
});

describe('createStorageRepository', () => {
  let repo: Repository;

  beforeEach(() => {
    repo = createStorageRepository(createMemoryKv());
  });

  it('starts empty', async () => {
    expect(await repo.listSets()).toEqual([]);
    expect(await repo.getSet('nope')).toBeNull();
    expect(await repo.getInProgress()).toBeNull();
  });

  it('round-trips a set and summarises it', async () => {
    await repo.saveSet(makeSet(), 'imported');
    expect(await repo.getSet('set-1')).toEqual(makeSet());

    const [summary] = await repo.listSets();
    expect(summary).toEqual({
      id: 'set-1',
      title: 'Set One',
      description: 'A set',
      version: '1.0.0',
      questionCount: 1,
      topicCount: 1,
      source: 'imported',
      attemptCount: 0,
      bestPercent: null,
      lastAttemptAt: null,
    });
  });

  it('replaces a set with the same id by default, keeping its attempts', async () => {
    await repo.saveSet(makeSet(), 'imported');
    await repo.saveAttempt(makeAttempt());
    await repo.saveSet(makeSet({ title: 'Set One v2', version: '2.0.0' }), 'imported');

    const sets = await repo.listSets();
    expect(sets).toHaveLength(1);
    expect(sets[0].title).toBe('Set One v2');
    expect(sets[0].attemptCount).toBe(1);
  });

  it('stores a copy under a new id with its own history', async () => {
    await repo.saveSet(makeSet(), 'imported');
    await repo.saveAttempt(makeAttempt());
    const copyId = await repo.saveSet(makeSet(), 'imported', 'copy');

    expect(copyId).not.toBe('set-1');
    const copy = await repo.getSet(copyId);
    expect(copy?.id).toBe(copyId);
    expect(await repo.listAttempts(copyId)).toEqual([]);
    expect(await repo.listSets()).toHaveLength(2);
  });

  it('summarises best score and last attempt date', async () => {
    await repo.saveSet(makeSet(), 'imported');
    await repo.saveAttempt(makeAttempt({ id: 'att_1', score: { correct: 1, total: 2, percent: 50, passed: false } }));
    await repo.saveAttempt(
      makeAttempt({
        id: 'att_2',
        finishedAt: '2026-09-07T10:00:00.000Z',
        score: { correct: 2, total: 2, percent: 100, passed: true },
      }),
    );

    const [summary] = await repo.listSets();
    expect(summary.attemptCount).toBe(2);
    expect(summary.bestPercent).toBe(100);
    expect(summary.lastAttemptAt).toBe('2026-09-07T10:00:00.000Z');
  });

  it('lists attempts newest first, across all sets when no id is given', async () => {
    await repo.saveSet(makeSet(), 'imported');
    await repo.saveSet(makeSet({ id: 'set-2', title: 'Set Two' }), 'imported');
    await repo.saveAttempt(makeAttempt({ id: 'att_old', finishedAt: '2026-09-01T10:00:00.000Z' }));
    await repo.saveAttempt(
      makeAttempt({ id: 'att_new', setId: 'set-2', finishedAt: '2026-09-08T10:00:00.000Z' }),
    );

    expect((await repo.listAttempts()).map((a) => a.id)).toEqual(['att_new', 'att_old']);
    expect((await repo.listAttempts('set-1')).map((a) => a.id)).toEqual(['att_old']);
  });

  it('finds one attempt by id', async () => {
    await repo.saveSet(makeSet(), 'imported');
    await repo.saveAttempt(makeAttempt());
    expect((await repo.getAttempt('att_1'))?.setId).toBe('set-1');
    expect(await repo.getAttempt('missing')).toBeNull();
  });

  it('deletes an imported set together with its attempts', async () => {
    await repo.saveSet(makeSet(), 'imported');
    await repo.saveAttempt(makeAttempt());
    await repo.deleteSet('set-1');

    expect(await repo.listSets()).toEqual([]);
    expect(await repo.getSet('set-1')).toBeNull();
    expect(await repo.listAttempts('set-1')).toEqual([]);
  });

  it('refuses to delete a bundled set', async () => {
    await repo.saveSet(makeSet(), 'bundled');
    await expect(repo.deleteSet('set-1')).rejects.toThrow('bundled');
  });

  it('saves and clears the in-progress session', async () => {
    const snapshot = { attemptId: 'att_x', setId: 'set-1', index: 2 } as unknown as SessionState;
    await repo.saveInProgress(snapshot);
    expect(await repo.getInProgress()).toEqual(snapshot);
    await repo.saveInProgress(null);
    expect(await repo.getInProgress()).toBeNull();
  });

  it('survives corrupt stored JSON instead of throwing', async () => {
    const kv = createMemoryKv({ 'pt:index': '{{{ not json' });
    const corrupted = createStorageRepository(kv);
    expect(await corrupted.listSets()).toEqual([]);
  });
});
