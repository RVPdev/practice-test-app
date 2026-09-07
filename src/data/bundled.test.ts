import { describe, expect, it } from '@jest/globals';
import { validateSet } from '@/core/validate';
import { createMemoryKv } from './kv';
import { createStorageRepository } from './storage';
import { BUNDLED_SETS, seedBundledSets } from './bundled';

describe('bundled sets', () => {
  it('ships at least two sets', () => {
    expect(BUNDLED_SETS.length).toBeGreaterThanOrEqual(2);
  });

  it('every bundled set passes the same validation as an import', () => {
    BUNDLED_SETS.forEach((raw) => {
      const result = validateSet(raw);
      if (!result.ok) {
        throw new Error(`bundled set invalid: ${JSON.stringify(result.errors, null, 2)}`);
      }
      expect(result.ok).toBe(true);
    });
  });

  it('covers all five question types across the samples', () => {
    const types = new Set(
      BUNDLED_SETS.flatMap((raw) => {
        const result = validateSet(raw);
        return result.ok ? result.set.questions.map((q) => q.type) : [];
      }),
    );
    expect([...types].sort()).toEqual(['boolean', 'matching', 'multi', 'ordering', 'single']);
  });

  it('seeds sets into an empty repository', async () => {
    const repo = createStorageRepository(createMemoryKv());
    await seedBundledSets(repo);
    const sets = await repo.listSets();
    expect(sets).toHaveLength(BUNDLED_SETS.length);
    expect(sets.every((s) => s.source === 'bundled')).toBe(true);
  });

  it('is idempotent and keeps attempt history on re-seed', async () => {
    const repo = createStorageRepository(createMemoryKv());
    await seedBundledSets(repo);

    // Save an attempt against the first bundled set
    const setId = 'sample-cloud-basics';
    const attempt = {
      id: 'att_test_reseed',
      setId,
      setVersion: '1.0.0',
      mode: 'mock' as const,
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
      byTopic: [{ topicId: 'storage', correct: 1, total: 1 }],
      answers: [{ questionId: 'cb-001', response: ['a'], correct: true, timeMs: 1000 }],
    };
    await repo.saveAttempt(attempt);

    // Re-seed, which should replace set content in place
    await seedBundledSets(repo);

    // Verify set count is unchanged
    expect(await repo.listSets()).toHaveLength(BUNDLED_SETS.length);

    // Verify the attempt is still retrievable
    const retrievedAttempt = await repo.getAttempt('att_test_reseed');
    expect(retrievedAttempt).not.toBeNull();
    expect(retrievedAttempt?.id).toBe('att_test_reseed');
    expect(retrievedAttempt?.setId).toBe(setId);
  });
});
