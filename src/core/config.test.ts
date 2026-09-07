import { describe, expect, it } from '@jest/globals';
import { DEFAULT_EXAM, resolveRunConfig } from './config';
import type { QuestionSet } from './schema';

const makeSet = (over: Partial<QuestionSet> = {}): QuestionSet =>
  ({
    schemaVersion: 1,
    id: 'set-1',
    title: 'Set One',
    questions: Array.from({ length: 40 }, (_, i) => ({
      id: `q-${i}`,
      type: 'boolean' as const,
      prompt: 'True?',
      answer: true,
    })),
    ...over,
  }) as QuestionSet;

describe('resolveRunConfig', () => {
  it('falls back to app defaults when the set has no exam block', () => {
    const config = resolveRunConfig(makeSet(), 'mock', undefined, 42);
    expect(config.questionCount).toBe(40);
    expect(config.timeLimitMinutes).toBeNull();
    expect(config.passingScore).toBe(DEFAULT_EXAM.passingScore);
    expect(config.seed).toBe(42);
  });

  it('takes values from the set exam block', () => {
    const set = makeSet({ exam: { questionCount: 25, timeLimitMinutes: 30, passingScore: 80 } });
    const config = resolveRunConfig(set, 'mock', undefined, 1);
    expect(config.questionCount).toBe(25);
    expect(config.timeLimitMinutes).toBe(30);
    expect(config.passingScore).toBe(80);
  });

  it('lets user overrides win over the set', () => {
    const set = makeSet({ exam: { questionCount: 25, timeLimitMinutes: 30 } });
    const config = resolveRunConfig(set, 'mock', { questionCount: 10, shuffleOptions: false }, 1);
    expect(config.questionCount).toBe(10);
    expect(config.shuffleOptions).toBe(false);
    expect(config.timeLimitMinutes).toBe(30);
  });

  it('caps questionCount at the size of the set', () => {
    const set = makeSet({ exam: { questionCount: 65 } });
    expect(resolveRunConfig(set, 'mock', undefined, 1).questionCount).toBe(40);
  });

  it('ignores the time limit in practice mode', () => {
    const set = makeSet({ exam: { timeLimitMinutes: 90, questionCount: 10 } });
    const config = resolveRunConfig(set, 'practice', undefined, 1);
    expect(config.timeLimitMinutes).toBeNull();
    expect(config.questionCount).toBe(40);
  });
});
