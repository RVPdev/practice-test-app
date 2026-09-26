import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import type { Question, QuestionSet } from '@/core/schema';
import { buildAttempt } from '@/core/scoring';
import {
  currentQuestionId,
  orderedItemIds,
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
  // Keep the same object for a no-op (e.g. every non-expiring TICK) so React bails out;
  // a fresh one would re-run the timer effect, which ticks again, forever.
  const state = sessionReducer(loaded.state, action);
  return state === loaded.state ? loaded : { ...loaded, state };
}

export function useSessionRunner() {
  const repository = useRepository();
  const [loaded, dispatch] = useReducer(reducer, null);
  const [loading, setLoading] = useState(true);
  const [remaining, setRemaining] = useState<number | null>(null);
  // Set only once the attempt is durably written - callers navigate on this, never on
  // `state.status`, which flips a full async round-trip before the attempt is readable.
  const [finishedAttemptId, setFinishedAttemptId] = useState<string | null>(null);
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
  const timed = !!loaded?.state.deadlineAt && loaded.state.status === 'active';
  useEffect(() => {
    if (!loaded || !timed) return;
    const tick = () => {
      const now = Date.now();
      setRemaining(remainingMs(loaded.state, now));
      dispatch({ type: 'TICK', nowMs: now });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [loaded, timed]);

  const finish = useCallback(
    async (state: SessionState, set: QuestionSet) => {
      if (finished.current) return;
      finished.current = true;
      const attempt = buildAttempt(state, set.questions, Date.now());
      await repository.saveAttempt(attempt);
      await repository.saveInProgress(null);
      setFinishedAttemptId(attempt.id);
    },
    [repository],
  );

  // Covers both the explicit submit and the timer's auto-submit.
  useEffect(() => {
    if (loaded?.state.status === 'submitted') {
      finish(loaded.state, loaded.set).catch((error) => {
        console.error('Failed to save the finished attempt', error);
      });
    }
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

  const itemOrder = useMemo(
    () => (loaded && question ? orderedItemIds(question, loaded.state.config) : []),
    [loaded, question],
  );

  return {
    loading,
    state: loaded?.state ?? null,
    set: loaded?.set ?? null,
    question,
    optionOrder,
    itemOrder,
    remaining: timed ? remaining : null,
    finishedAttemptId,
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
