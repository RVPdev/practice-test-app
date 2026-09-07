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
    await seedBundledSets(repo);
    expect(await repo.listSets()).toHaveLength(BUNDLED_SETS.length);
  });
});
