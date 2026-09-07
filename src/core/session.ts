import type { Question, QuestionSet } from './schema';
import { deriveSeed, shuffle } from './shuffle';
import type { RunConfig, RunMode, SessionAction, SessionState } from './types';

export function currentQuestionId(state: SessionState): string {
  return state.questionIds[state.index];
}

export function isRevealed(state: SessionState, questionId: string): boolean {
  return state.revealed.includes(questionId);
}

export function remainingMs(state: SessionState, nowMs: number): number | null {
  if (!state.deadlineAt) return null;
  return Math.max(0, Date.parse(state.deadlineAt) - nowMs);
}

export function orderedOptionIds(question: Question, config: RunConfig): string[] {
  if (question.type !== 'single' && question.type !== 'multi') return [];
  const ids = question.options.map((o) => o.id);
  if (!config.shuffleOptions) return ids;
  return shuffle(ids, deriveSeed(config.seed, question.id));
}

/** Ordering items are always presented shuffled - the authored order is the answer. */
export function orderedItemIds(question: Question, config: RunConfig): string[] {
  if (question.type !== 'ordering') return [];
  return shuffle(
    question.items.map((i) => i.id),
    deriveSeed(config.seed, `${question.id}:items`),
  );
}

export function startSession(
  set: QuestionSet,
  mode: RunMode,
  config: RunConfig,
  nowMs: number,
): SessionState {
  const allIds = set.questions.map((q) => q.id);
  const ordered = config.shuffleQuestions ? shuffle(allIds, config.seed) : allIds;
  const questionIds = ordered.slice(0, config.questionCount);
  const startedAt = new Date(nowMs).toISOString();

  return {
    attemptId: `att_${startedAt}`,
    setId: set.id,
    setVersion: set.version ?? null,
    mode,
    config,
    questionIds,
    index: 0,
    answers: {},
    revealed: [],
    timeMs: {},
    startedAt,
    deadlineAt:
      config.timeLimitMinutes === null
        ? null
        : new Date(nowMs + config.timeLimitMinutes * 60000).toISOString(),
    enteredAt: nowMs,
    status: 'active',
  };
}

/** Banks the time spent on the question being left and restarts the clock. */
function bankTime(state: SessionState, nowMs: number): SessionState {
  const questionId = currentQuestionId(state);
  const elapsed = Math.max(0, nowMs - state.enteredAt);
  return {
    ...state,
    timeMs: { ...state.timeMs, [questionId]: (state.timeMs[questionId] ?? 0) + elapsed },
    enteredAt: nowMs,
  };
}

function moveTo(state: SessionState, index: number, nowMs: number): SessionState {
  const clamped = Math.min(Math.max(0, index), state.questionIds.length - 1);
  if (clamped === state.index) return state;
  return { ...bankTime(state, nowMs), index: clamped };
}

function submit(state: SessionState, nowMs: number): SessionState {
  return { ...bankTime(state, nowMs), status: 'submitted' };
}

export function sessionReducer(state: SessionState, action: SessionAction): SessionState {
  if (state.status === 'submitted') return state;

  switch (action.type) {
    case 'ANSWER': {
      // Practice locks an answer the moment it is revealed (spec 6.4).
      if (state.mode === 'practice' && isRevealed(state, action.questionId)) return state;
      return { ...state, answers: { ...state.answers, [action.questionId]: action.response } };
    }

    case 'REVEAL': {
      if (state.mode !== 'practice') return state;
      if (isRevealed(state, action.questionId)) return state;
      return { ...state, revealed: [...state.revealed, action.questionId] };
    }

    case 'NEXT': {
      // Practice advances only after the current question has been revealed.
      if (state.mode === 'practice' && !isRevealed(state, currentQuestionId(state))) return state;
      return moveTo(state, state.index + 1, action.nowMs);
    }

    case 'PREV': {
      if (state.mode === 'practice') return state;
      return moveTo(state, state.index - 1, action.nowMs);
    }

    case 'GOTO': {
      if (state.mode === 'practice') return state;
      return moveTo(state, action.index, action.nowMs);
    }

    case 'TICK': {
      const remaining = remainingMs(state, action.nowMs);
      if (remaining === null || remaining > 0) return state;
      return submit(state, action.nowMs);
    }

    case 'SUBMIT':
      return submit(state, action.nowMs);
  }
}
