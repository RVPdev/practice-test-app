import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import type { Question, QuestionSet } from '@/core/schema';
import { buildAttempt } from '@/core/scoring';
import {
  currentQuestionId,
  orderedOptionIds,
  remainingMs,
  sessionReducer,
} from '@/core/session';
import type { SessionAction, SessionState } from '@/core/types';
import { useRepository } from '@/data/RepositoryProvider';

type Loaded = { state: SessionState; set: QuestionSet };

function reducer(loaded: Loaded | null, action: SessionAction | { type: 'LOAD'; loaded: Loaded }) {
  if (action.type === 'LOAD') return action.loaded;
  if (!loaded) return loaded;
  return { ...loaded, state: sessionReducer(loaded.state, action) };
}

export function useSessionRunner() {
  const repository = useRepository();
  const [loaded, dispatch] = useReducer(reducer, null);
  const [loading, setLoading] = useState(true);
  const [remaining, setRemaining] = useState<number | null>(null);
  const finished = useRef(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const state = await repository.getInProgress();
      const set = state ? await repository.getSet(state.setId) : null;
      if (!cancelled && state && set) dispatch({ type: 'LOAD', loaded: { state, set } });
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [repository]);

  // Every state change is written through, so a crash costs at most the current tap.
  useEffect(() => {
    if (!loaded || loaded.state.status !== 'active') return;
    repository.saveInProgress(loaded.state).catch((error) => {
      console.error('Failed to save session progress', error);
    });
  }, [loaded, repository]);

  // The clock is derived from the absolute deadline, never from a counter.
  useEffect(() => {
    if (!loaded?.state.deadlineAt || loaded.state.status !== 'active') {
      setRemaining(null);
      return;
    }
    const tick = () => {
      const now = Date.now();
      setRemaining(remainingMs(loaded.state, now));
      dispatch({ type: 'TICK', nowMs: now });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [loaded]);

  const finish = useCallback(
    async (state: SessionState, set: QuestionSet) => {
      if (finished.current) return;
      finished.current = true;
      const attempt = buildAttempt(state, set.questions, Date.now());
      await repository.saveAttempt(attempt);
      await repository.saveInProgress(null);
    },
    [repository],
  );

  // Covers both the explicit submit and the timer's auto-submit.
  useEffect(() => {
    if (loaded?.state.status === 'submitted') void finish(loaded.state, loaded.set);
  }, [loaded, finish]);

  const question: Question | null = useMemo(() => {
    if (!loaded) return null;
    const id = currentQuestionId(loaded.state);
    return loaded.set.questions.find((q) => q.id === id) ?? null;
  }, [loaded]);

  const optionOrder = useMemo(
    () => (loaded && question ? orderedOptionIds(question, loaded.state.config) : []),
    [loaded, question],
  );

  return {
    loading,
    state: loaded?.state ?? null,
    set: loaded?.set ?? null,
    question,
    optionOrder,
    remaining,
    answer: (response: string[]) => {
      if (question) dispatch({ type: 'ANSWER', questionId: question.id, response });
    },
    reveal: () => {
      if (question) dispatch({ type: 'REVEAL', questionId: question.id });
    },
    next: () => dispatch({ type: 'NEXT', nowMs: Date.now() }),
    prev: () => dispatch({ type: 'PREV', nowMs: Date.now() }),
    goto: (index: number) => dispatch({ type: 'GOTO', index, nowMs: Date.now() }),
    submit: () => dispatch({ type: 'SUBMIT', nowMs: Date.now() }),
  };
}
