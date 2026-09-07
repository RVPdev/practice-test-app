import type { QuestionSet } from './schema';
import type { RunConfig, RunMode, RunOverrides } from './types';

export const DEFAULT_EXAM = {
  passingScore: 70,
  shuffleQuestions: true,
  shuffleOptions: true,
} as const;

export function resolveRunConfig(
  set: QuestionSet,
  mode: RunMode,
  overrides: RunOverrides | undefined,
  seed: number,
): RunConfig {
  const exam = set.exam ?? {};
  const total = set.questions.length;

  // Practice walks the whole set and is never timed (spec §6.2).
  const requested =
    mode === 'practice' ? total : (overrides?.questionCount ?? exam.questionCount ?? total);
  const timeLimit =
    mode === 'practice'
      ? null
      : (overrides?.timeLimitMinutes ?? exam.timeLimitMinutes ?? null);

  return {
    questionCount: Math.min(Math.max(1, requested), total),
    timeLimitMinutes: timeLimit,
    passingScore: overrides?.passingScore ?? exam.passingScore ?? DEFAULT_EXAM.passingScore,
    shuffleQuestions:
      overrides?.shuffleQuestions ?? exam.shuffleQuestions ?? DEFAULT_EXAM.shuffleQuestions,
    shuffleOptions:
      overrides?.shuffleOptions ?? exam.shuffleOptions ?? DEFAULT_EXAM.shuffleOptions,
    seed,
  };
}
