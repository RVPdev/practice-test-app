import { describe, expect, it } from '@jest/globals';
import { resolveRunConfig } from './config';
import type { QuestionSet } from './schema';
import {
  currentQuestionId,
  isRevealed,
  orderedOptionIds,
  remainingMs,
  sessionReducer,
  startSession,
} from './session';
import type { RunConfig, RunMode, SessionState } from './types';

const set: QuestionSet = {
  schemaVersion: 1,
  id: 'set-1',
  title: 'Set One',
  version: '1.0.0',
  questions: Array.from({ length: 6 }, (_, i) => ({
    id: `q-${i}`,
    type: 'single' as const,
    prompt: `Question ${i}`,
    options: [
      { id: 'a', text: 'A', correct: true },
      { id: 'b', text: 'B', correct: false },
      { id: 'c', text: 'C', correct: false },
    ],
  })),
};

const T0 = Date.parse('2026-09-06T14:00:00.000Z');

const mockConfig = (over: Partial<RunConfig> = {}): RunConfig => ({
  ...resolveRunConfig(set, 'mock', { questionCount: 4, timeLimitMinutes: 30 }, 42),
  ...over,
});

const practiceConfig = (): RunConfig => resolveRunConfig(set, 'practice', undefined, 42);

const start = (mode: RunMode = 'mock', config: RunConfig = mockConfig()): SessionState =>
  startSession(set, mode, config, T0);

describe('startSession', () => {
  it('takes exactly questionCount questions', () => {
    expect(start().questionIds).toHaveLength(4);
  });

  it('is deterministic for the same seed', () => {
    expect(start().questionIds).toEqual(start().questionIds);
  });

  it('keeps the authored order when shuffleQuestions is false', () => {
    const state = start('mock', mockConfig({ shuffleQuestions: false }));
    expect(state.questionIds).toEqual(['q-0', 'q-1', 'q-2', 'q-3']);
  });

  it('sets an absolute deadline from the time limit', () => {
    expect(start().deadlineAt).toBe('2026-09-06T14:30:00.000Z');
  });

  it('has no deadline in practice mode and walks the whole set', () => {
    const state = start('practice', practiceConfig());
    expect(state.deadlineAt).toBeNull();
    expect(state.questionIds).toHaveLength(6);
  });

  it('records the set version for later review warnings', () => {
    expect(start().setVersion).toBe('1.0.0');
  });
});

describe('mock mode navigation', () => {
  it('records an answer', () => {
    const initial = start();
    const state = sessionReducer(initial, {
      type: 'ANSWER',
      questionId: currentQuestionId(initial),
      response: ['a'],
    });
    expect(state.answers[currentQuestionId(state)]).toEqual(['a']);
  });

  it('moves forward and back, staying in bounds', () => {
    let state = start();
    state = sessionReducer(state, { type: 'PREV', nowMs: T0 + 1000 });
    expect(state.index).toBe(0);
    state = sessionReducer(state, { type: 'NEXT', nowMs: T0 + 2000 });
    expect(state.index).toBe(1);
    state = sessionReducer(state, { type: 'GOTO', index: 3, nowMs: T0 + 3000 });
    expect(state.index).toBe(3);
    state = sessionReducer(state, { type: 'NEXT', nowMs: T0 + 4000 });
    expect(state.index).toBe(3);
  });

  it('accumulates time on the question being left', () => {
    let state = start();
    const first = currentQuestionId(state);
    state = sessionReducer(state, { type: 'NEXT', nowMs: T0 + 5000 });
    expect(state.timeMs[first]).toBe(5000);
    state = sessionReducer(state, { type: 'PREV', nowMs: T0 + 8000 });
    expect(state.timeMs[currentQuestionId(state)]).toBe(5000);
  });

  it('never reveals', () => {
    const state = sessionReducer(start(), { type: 'REVEAL', questionId: 'q-0' });
    expect(state.revealed).toEqual([]);
  });
});

describe('practice mode', () => {
  it('will not advance before the current question is revealed', () => {
    const state = sessionReducer(start('practice', practiceConfig()), {
      type: 'NEXT',
      nowMs: T0 + 1000,
    });
    expect(state.index).toBe(0);
  });

  it('advances after a reveal', () => {
    let state = start('practice', practiceConfig());
    const first = currentQuestionId(state);
    state = sessionReducer(state, { type: 'REVEAL', questionId: first });
    expect(isRevealed(state, first)).toBe(true);
    state = sessionReducer(state, { type: 'NEXT', nowMs: T0 + 1000 });
    expect(state.index).toBe(1);
  });

  it('locks the answer once revealed', () => {
    let state = start('practice', practiceConfig());
    const first = currentQuestionId(state);
    state = sessionReducer(state, { type: 'ANSWER', questionId: first, response: ['b'] });
    state = sessionReducer(state, { type: 'REVEAL', questionId: first });
    state = sessionReducer(state, { type: 'ANSWER', questionId: first, response: ['a'] });
    expect(state.answers[first]).toEqual(['b']);
  });

  it('does not go back', () => {
    let state = start('practice', practiceConfig());
    state = sessionReducer(state, { type: 'REVEAL', questionId: currentQuestionId(state) });
    state = sessionReducer(state, { type: 'NEXT', nowMs: T0 + 1000 });
    state = sessionReducer(state, { type: 'PREV', nowMs: T0 + 2000 });
    expect(state.index).toBe(1);
  });
});

describe('the clock', () => {
  it('reports remaining time from the absolute deadline', () => {
    expect(remainingMs(start(), T0 + 60000)).toBe(29 * 60 * 1000);
  });

  it('returns null when there is no time limit', () => {
    expect(remainingMs(start('practice', practiceConfig()), T0 + 60000)).toBeNull();
  });

  it('leaves an active session alone before the deadline', () => {
    expect(sessionReducer(start(), { type: 'TICK', nowMs: T0 + 60000 }).status).toBe('active');
  });

  it('auto-submits once the deadline has passed', () => {
    const state = sessionReducer(start(), { type: 'TICK', nowMs: T0 + 31 * 60 * 1000 });
    expect(state.status).toBe('submitted');
  });

  it('clamps remaining time at zero', () => {
    expect(remainingMs(start(), T0 + 60 * 60 * 1000)).toBe(0);
  });
});

describe('submission', () => {
  it('marks the session submitted and banks the last question time', () => {
    const state = sessionReducer(start(), { type: 'SUBMIT', nowMs: T0 + 9000 });
    expect(state.status).toBe('submitted');
    expect(state.timeMs[state.questionIds[0]]).toBe(9000);
  });

  it('ignores every action after submission', () => {
    const submitted = sessionReducer(start(), { type: 'SUBMIT', nowMs: T0 + 9000 });
    const after = sessionReducer(submitted, {
      type: 'ANSWER',
      questionId: 'q-0',
      response: ['a'],
    });
    expect(after).toBe(submitted);
  });
});

describe('orderedOptionIds', () => {
  const question = set.questions[0];

  it('is deterministic for a seed and question', () => {
    const config = mockConfig();
    expect(orderedOptionIds(question, config)).toEqual(orderedOptionIds(question, config));
  });

  it('keeps the authored order when shuffleOptions is false', () => {
    expect(orderedOptionIds(question, mockConfig({ shuffleOptions: false }))).toEqual([
      'a',
      'b',
      'c',
    ]);
  });

  it('gives different questions different orderings under the same seed', () => {
    const config = mockConfig();
    const orders = set.questions.map((q) => orderedOptionIds(q, config).join(''));
    expect(new Set(orders).size).toBeGreaterThan(1);
  });
});
