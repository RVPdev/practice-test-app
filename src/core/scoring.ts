import type { Question } from './schema';
import type { AnswerRecord, Attempt, Score, SessionState, TopicScore } from './types';

export const UNCATEGORIZED = 'uncategorized';

const sameSet = (a: string[], b: string[]): boolean =>
  a.length === b.length && [...a].sort().join(' ') === [...b].sort().join(' ');

const sameSequence = (a: string[], b: string[]): boolean =>
  a.length === b.length && a.every((value, i) => value === b[i]);

export function correctResponse(question: Question): string[] {
  switch (question.type) {
    case 'single':
    case 'multi':
      return question.options.filter((o) => o.correct).map((o) => o.id);
    case 'boolean':
      return [question.answer ? 'true' : 'false'];
    case 'ordering':
      return [...question.correctOrder];
    case 'matching':
      return question.pairs.map((p) => `${p.left}:${p.right}`);
  }
}

export function isCorrect(question: Question, response: string[]): boolean {
  if (response.length === 0) return false;
  const expected = correctResponse(question);
  // Ordering is the one type where the sequence itself is the answer.
  return question.type === 'ordering'
    ? sameSequence(response, expected)
    : sameSet(response, expected);
}

export function scoreAnswers(
  questions: Question[],
  answers: AnswerRecord[],
  passingScore: number,
): { score: Score; byTopic: TopicScore[] } {
  const byId = new Map(answers.map((a) => [a.questionId, a]));
  const topics = new Map<string, TopicScore>();
  let correct = 0;

  questions.forEach((question) => {
    const answer = byId.get(question.id);
    const isRight = answer?.correct ?? false;
    if (isRight) correct += 1;

    const topicId = question.topicId ?? UNCATEGORIZED;
    const bucket = topics.get(topicId) ?? { topicId, correct: 0, total: 0 };
    bucket.total += 1;
    if (isRight) bucket.correct += 1;
    topics.set(topicId, bucket);
  });

  const total = questions.length;
  const percent = total === 0 ? 0 : Math.round((correct / total) * 1000) / 10;

  return {
    score: { correct, total, percent, passed: percent >= passingScore },
    byTopic: [...topics.values()],
  };
}

export function buildAttempt(
  state: SessionState,
  questions: Question[],
  finishedAtMs: number,
): Attempt {
  const byId = new Map(questions.map((q) => [q.id, q]));
  const inRun = state.questionIds
    .map((id) => byId.get(id))
    .filter((q): q is Question => q !== undefined);

  const answers: AnswerRecord[] = inRun.map((question) => {
    const response = state.answers[question.id] ?? [];
    return {
      questionId: question.id,
      response,
      correct: isCorrect(question, response),
      timeMs: state.timeMs[question.id] ?? 0,
    };
  });

  const { score, byTopic } = scoreAnswers(inRun, answers, state.config.passingScore);

  return {
    id: state.attemptId,
    setId: state.setId,
    setVersion: state.setVersion,
    mode: state.mode,
    startedAt: state.startedAt,
    finishedAt: new Date(finishedAtMs).toISOString(),
    config: state.config,
    score,
    byTopic,
    answers,
  };
}
