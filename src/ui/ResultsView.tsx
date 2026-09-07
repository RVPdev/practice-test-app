import { Text, View } from 'react-native';
import type { QuestionSet } from '@/core/schema';
import { UNCATEGORIZED } from '@/core/scoring';
import type { Attempt } from '@/core/types';
import { Button } from './Button';
import { Card } from './Card';
import { Feedback } from './Feedback';
import { formatDuration, formatPercent } from './format';
import { ProgressBar } from './ProgressBar';
import { QuestionCard } from './QuestionCard';
import { Screen } from './Screen';
import { spacing, type, useTheme } from './theme';

export function ResultsView({
  attempt,
  set,
  onDone,
}: {
  attempt: Attempt;
  set: QuestionSet;
  onDone: () => void;
}) {
  const theme = useTheme();
  const elapsed = Date.parse(attempt.finishedAt) - Date.parse(attempt.startedAt);
  const topicName = (topicId: string) =>
    topicId === UNCATEGORIZED
      ? 'Uncategorized'
      : (set.topics?.find((t) => t.id === topicId)?.name ?? topicId);

  // Weakest first - that is the row worth acting on.
  const topics = [...attempt.byTopic].sort(
    (a, b) => a.correct / a.total - b.correct / b.total,
  );

  const byId = new Map(set.questions.map((q) => [q.id, q]));
  const stale = attempt.setVersion !== null && attempt.setVersion !== (set.version ?? null);

  return (
    <Screen>
      <Card>
        <Text style={[type.title, { color: theme.text }]}>{formatPercent(attempt.score.percent)}</Text>
        <Text style={[type.body, { color: theme.textMuted }]}>
          {`${attempt.score.correct} of ${attempt.score.total} correct`}
        </Text>
        {attempt.mode === 'mock' ? (
          <Text
            style={[
              type.label,
              { color: attempt.score.passed ? theme.positive : theme.negative },
            ]}
          >
            {attempt.score.passed
              ? `Passed (needed ${formatPercent(attempt.config.passingScore)})`
              : `Did not pass (needed ${formatPercent(attempt.config.passingScore)})`}
          </Text>
        ) : null}
        <Text style={[type.caption, { color: theme.textMuted }]}>{formatDuration(elapsed)}</Text>
      </Card>

      {stale ? (
        <Card testID="version-warning">
          <Text style={[type.caption, { color: theme.textMuted }]}>
            This set has been updated since this attempt, so the questions below may differ from
            the ones you answered.
          </Text>
        </Card>
      ) : null}

      <Card>
        <Text style={[type.heading, { color: theme.text }]}>By topic</Text>
        {topics.map((topic) => (
          <View key={topic.topicId} testID={`topic-row-${topic.topicId}`} style={{ gap: spacing.xs }}>
            <View style={{ flexDirection: 'row' }}>
              <Text style={[type.body, { color: theme.text, flex: 1 }]}>
                {topicName(topic.topicId)}
              </Text>
              <Text style={[type.caption, { color: theme.textMuted }]}>
                {`${topic.correct}/${topic.total}`}
              </Text>
            </View>
            <ProgressBar
              fraction={topic.correct / topic.total}
              tone={topic.correct === topic.total ? 'positive' : 'negative'}
            />
          </View>
        ))}
      </Card>

      <Text style={[type.heading, { color: theme.text }]}>Review</Text>
      {attempt.answers.map((answer) => {
        const question = byId.get(answer.questionId);
        if (!question) return null;
        return (
          <View key={answer.questionId} style={{ gap: spacing.sm }}>
            <QuestionCard
              question={question}
              response={answer.response}
              revealed
              optionOrder={[]}
              onChange={() => {}}
            />
            <Feedback question={question} response={answer.response} />
          </View>
        );
      })}

      <Button title="Done" onPress={onDone} testID="results-done" />
    </Screen>
  );
}
