import { describe, expect, it } from '@jest/globals';
import { buildAttempt, correctResponse, isCorrect, scoreAnswers, UNCATEGORIZED } from './scoring';
import type { Question } from './schema';
import type { AnswerRecord, SessionState } from './types';

const single: Question = {
  id: 'q-single',
  type: 'single',
  topicId: 'vpc',
  prompt: 'Which?',
  options: [
    { id: 'a', text: 'A', correct: true },
    { id: 'b', text: 'B', correct: false },
  ],
};

const multi: Question = {
  id: 'q-multi',
  type: 'multi',
  topicId: 'vpc',
  prompt: 'Which two?',
  options: [
    { id: 'a', text: 'A', correct: true },
    { id: 'b', text: 'B', correct: true },
    { id: 'c', text: 'C', correct: false },
  ],
};

const boolQ: Question = { id: 'q-bool', type: 'boolean', prompt: 'True?', answer: false };

const ordering: Question = {
  id: 'q-ord',
  type: 'ordering',
  prompt: 'Order these',
  items: [
    { id: 'i1', text: 'One' },
    { id: 'i2', text: 'Two' },
  ],
  correctOrder: ['i1', 'i2'],
};

const matching: Question = {
  id: 'q-mat',
  type: 'matching',
  prompt: 'Match these',
  left: [
    { id: 'l1', text: 'S3' },
    { id: 'l2', text: 'EBS' },
  ],
  right: [
    { id: 'r1', text: 'Object' },
    { id: 'r2', text: 'Block' },
  ],
  pairs: [
    { left: 'l1', right: 'r1' },
    { left: 'l2', right: 'r2' },
  ],
};

describe('isCorrect', () => {
  it('scores single choice', () => {
    expect(isCorrect(single, ['a'])).toBe(true);
    expect(isCorrect(single, ['b'])).toBe(false);
    expect(isCorrect(single, [])).toBe(false);
    expect(isCorrect(single, ['a', 'b'])).toBe(false);
  });

  it('scores multi choice all-or-nothing, ignoring order', () => {
    expect(isCorrect(multi, ['b', 'a'])).toBe(true);
    expect(isCorrect(multi, ['a'])).toBe(false);
    expect(isCorrect(multi, ['a', 'b', 'c'])).toBe(false);
  });

  it('scores boolean', () => {
    expect(isCorrect(boolQ, ['false'])).toBe(true);
    expect(isCorrect(boolQ, ['true'])).toBe(false);
    expect(isCorrect(boolQ, [])).toBe(false);
  });

  it('scores ordering by exact sequence', () => {
    expect(isCorrect(ordering, ['i1', 'i2'])).toBe(true);
    expect(isCorrect(ordering, ['i2', 'i1'])).toBe(false);
    expect(isCorrect(ordering, ['i1'])).toBe(false);
  });

  it('scores matching by exact pair set, ignoring order', () => {
    expect(isCorrect(matching, ['l2:r2', 'l1:r1'])).toBe(true);
    expect(isCorrect(matching, ['l1:r1'])).toBe(false);
    expect(isCorrect(matching, ['l1:r2', 'l2:r1'])).toBe(false);
  });
});

describe('correctResponse', () => {
  it('returns the canonical answer for each type', () => {
    expect(correctResponse(single)).toEqual(['a']);
    expect(correctResponse(multi).sort()).toEqual(['a', 'b']);
    expect(correctResponse(boolQ)).toEqual(['false']);
    expect(correctResponse(ordering)).toEqual(['i1', 'i2']);
    expect(correctResponse(matching)).toEqual(['l1:r1', 'l2:r2']);
  });
});

describe('scoreAnswers', () => {
  const answer = (questionId: string, correct: boolean): AnswerRecord => ({
    questionId,
    response: [],
    correct,
    timeMs: 0,
  });

  it('computes correct, total, percent and pass', () => {
    const { score } = scoreAnswers(
      [single, multi, boolQ, ordering],
      [
        answer('q-single', true),
        answer('q-multi', true),
        answer('q-bool', true),
        answer('q-ord', false),
      ],
      70,
    );
    expect(score).toEqual({ correct: 3, total: 4, percent: 75, passed: true });
  });

  it('fails below the passing score', () => {
    const { score } = scoreAnswers(
      [single, multi],
      [answer('q-single', true), answer('q-multi', false)],
      70,
    );
    expect(score.percent).toBe(50);
    expect(score.passed).toBe(false);
  });

  it('counts a missing answer as incorrect and keeps it in the denominator', () => {
    const { score } = scoreAnswers([single, multi], [answer('q-single', true)], 70);
    expect(score).toEqual({ correct: 1, total: 2, percent: 50, passed: false });
  });

  it('rounds percent to one decimal', () => {
    const { score } = scoreAnswers(
      [single, multi, boolQ],
      [answer('q-single', true), answer('q-multi', true)],
      70,
    );
    expect(score.percent).toBe(66.7);
  });

  it('groups by topic and puts untagged questions under uncategorized', () => {
    const { byTopic } = scoreAnswers(
      [single, multi, boolQ],
      [answer('q-single', true), answer('q-multi', false), answer('q-bool', true)],
      70,
    );
    expect(byTopic).toEqual([
      { topicId: 'vpc', correct: 1, total: 2 },
      { topicId: UNCATEGORIZED, correct: 1, total: 1 },
    ]);
  });
});

describe('buildAttempt', () => {
  const state: SessionState = {
    attemptId: 'att_test',
    setId: 'set-1',
    setVersion: '1.2.0',
    mode: 'mock',
    config: {
      questionCount: 2,
      timeLimitMinutes: 30,
      passingScore: 70,
      shuffleQuestions: true,
      shuffleOptions: true,
      seed: 42,
    },
    questionIds: ['q-single', 'q-multi'],
    index: 1,
    answers: { 'q-single': ['a'], 'q-multi': ['a'] },
    revealed: [],
    timeMs: { 'q-single': 12000 },
    startedAt: '2026-09-06T14:00:00.000Z',
    deadlineAt: '2026-09-06T14:30:00.000Z',
    enteredAt: 0,
    status: 'submitted',
  };

  it('produces an attempt scored over the questions in the run', () => {
    const attempt = buildAttempt(
      state,
      [single, multi, boolQ],
      Date.parse('2026-09-06T14:20:00.000Z'),
    );
    expect(attempt.id).toBe('att_test');
    expect(attempt.setId).toBe('set-1');
    expect(attempt.setVersion).toBe('1.2.0');
    expect(attempt.finishedAt).toBe('2026-09-06T14:20:00.000Z');
    expect(attempt.score).toEqual({ correct: 1, total: 2, percent: 50, passed: false });
    expect(attempt.answers).toEqual([
      { questionId: 'q-single', response: ['a'], correct: true, timeMs: 12000 },
      { questionId: 'q-multi', response: ['a'], correct: false, timeMs: 0 },
    ]);
  });

  it('records an unanswered question as an empty response', () => {
    const attempt = buildAttempt(
      { ...state, answers: {} },
      [single, multi],
      Date.parse('2026-09-06T14:20:00.000Z'),
    );
    expect(attempt.answers[0]).toEqual({
      questionId: 'q-single',
      response: [],
      correct: false,
      timeMs: 12000,
    });
  });
});
