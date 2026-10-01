import { describe, expect, it } from '@jest/globals';
import { validateSet } from '@/core/validate';
import { createMemoryKv } from './kv';
import { createStorageRepository } from './storage';
import { BUNDLED_FAMILIES, BUNDLED_SETS, familyForSet, groupSetsByFamily, seedBundledSets } from './bundled';
import type { SetSummary } from './repository';

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

describe('familyForSet', () => {
  it('resolves every id in BUNDLED_FAMILIES to its own family label', () => {
    for (const family of BUNDLED_FAMILIES) {
      for (const id of family.setIds) {
        expect(familyForSet({ id, title: 'irrelevant', source: 'bundled' })).toBe(family.label);
      }
    }
  });

  it("falls back to the set's own title for a bundled id with no family entry", () => {
    expect(familyForSet({ id: 'future-exam-xyz', title: 'Future Exam', source: 'bundled' })).toBe(
      'Future Exam',
    );
  });

  it('always resolves an imported set to "My sets", regardless of its id', () => {
    expect(
      familyForSet({ id: 'comptia-a-plus-core-1-220-1201', title: 'Copy', source: 'imported' }),
    ).toBe('My sets');
  });
});

describe('groupSetsByFamily', () => {
  const make = (over: Partial<SetSummary>): SetSummary => ({
    id: 'x',
    title: 'X',
    description: null,
    version: null,
    questionCount: 1,
    topicCount: 0,
    source: 'bundled',
    attemptCount: 0,
    bestPercent: null,
    lastAttemptAt: null,
    ...over,
  });

  it('orders a known family before "My sets", and its own sets by catalog order', () => {
    const groups = groupSetsByFamily([
      make({ id: 'quick-comptia-security-plus-sy0-701', title: 'Quick Sec+' }),
      make({ id: 'comptia-security-plus-sy0-701', title: 'Sec+' }),
      make({ id: 'imported-1', title: 'Mine', source: 'imported' }),
    ]);
    expect(groups.map((g) => g.family)).toEqual(['Security+', 'My sets']);
    expect(groups[0].sets.map((s) => s.id)).toEqual([
      'comptia-security-plus-sy0-701',
      'quick-comptia-security-plus-sy0-701',
    ]);
  });

  it('omits a family entirely when none of its sets are present', () => {
    const groups = groupSetsByFamily([make({ id: 'comptia-security-plus-sy0-701', title: 'Sec+' })]);
    expect(groups.map((g) => g.family)).not.toContain('A+ Core 2');
  });

  it('groups an unmapped bundled id under its own title instead of dropping it', () => {
    const groups = groupSetsByFamily([make({ id: 'future-exam-xyz', title: 'Future Exam' })]);
    expect(groups).toEqual([
      { family: 'Future Exam', sets: [expect.objectContaining({ id: 'future-exam-xyz' })] },
    ]);
  });

  it('does not crash when a catalog entry references an id absent from the input list', () => {
    // Security+'s vol2/quick ids aren't in the input - only the full exam is.
    const groups = groupSetsByFamily([make({ id: 'comptia-security-plus-sy0-701', title: 'Sec+' })]);
    expect(groups.find((g) => g.family === 'Security+')?.sets).toHaveLength(1);
  });

  it('returns no groups for an empty input', () => {
    expect(groupSetsByFamily([])).toEqual([]);
  });
});
