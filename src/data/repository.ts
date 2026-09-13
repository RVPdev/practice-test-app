import type { QuestionSet } from '@/core/schema';
import type { Attempt, SessionState } from '@/core/types';

export type SetSource = 'bundled' | 'imported';

export type SaveMode = 'replace' | 'copy';

export type SetSummary = {
  id: string;
  title: string;
  description: string | null;
  version: string | null;
  questionCount: number;
  topicCount: number;
  source: SetSource;
  attemptCount: number;
  bestPercent: number | null;
  lastAttemptAt: string | null;
};

export interface Repository {
  listSets(): Promise<SetSummary[]>;
  getSet(setId: string): Promise<QuestionSet | null>;
  /** Returns the id the set was stored under - a copy gets a new one. */
  saveSet(set: QuestionSet, source: SetSource, mode?: SaveMode): Promise<string>;
  deleteSet(setId: string): Promise<void>;
  listAttempts(setId?: string): Promise<Attempt[]>;
  getAttempt(attemptId: string): Promise<Attempt | null>;
  saveAttempt(attempt: Attempt): Promise<void>;
  getInProgress(): Promise<SessionState | null>;
  saveInProgress(state: SessionState | null): Promise<void>;
  getTermsAccepted(): Promise<boolean>;
  acceptTerms(): Promise<void>;
}
