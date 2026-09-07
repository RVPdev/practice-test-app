export type RunMode = 'mock' | 'practice';

export type RunConfig = {
  questionCount: number;
  timeLimitMinutes: number | null;
  passingScore: number;
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  seed: number;
};

export type RunOverrides = Partial<Omit<RunConfig, 'seed'>>;

/** `response` holds option ids, ["true"]/["false"], an ordered id list, or "left:right" pairs. */
export type AnswerRecord = {
  questionId: string;
  response: string[];
  correct: boolean;
  timeMs: number;
};

export type TopicScore = { topicId: string; correct: number; total: number };

export type Score = { correct: number; total: number; percent: number; passed: boolean };

export type Attempt = {
  id: string;
  setId: string;
  setVersion: string | null;
  mode: RunMode;
  startedAt: string;
  finishedAt: string;
  config: RunConfig;
  score: Score;
  byTopic: TopicScore[];
  answers: AnswerRecord[];
};

/** Serializable in full — this doubles as the resume snapshot. */
export type SessionState = {
  attemptId: string;
  setId: string;
  setVersion: string | null;
  mode: RunMode;
  config: RunConfig;
  questionIds: string[];
  index: number;
  answers: Record<string, string[]>;
  revealed: string[];
  timeMs: Record<string, number>;
  startedAt: string;
  deadlineAt: string | null;
  enteredAt: number;
  status: 'active' | 'submitted';
};

export type SessionAction =
  | { type: 'ANSWER'; questionId: string; response: string[] }
  | { type: 'REVEAL'; questionId: string }
  | { type: 'NEXT'; nowMs: number }
  | { type: 'PREV'; nowMs: number }
  | { type: 'GOTO'; index: number; nowMs: number }
  | { type: 'TICK'; nowMs: number }
  | { type: 'SUBMIT'; nowMs: number };
