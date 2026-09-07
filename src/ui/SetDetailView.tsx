import { useState } from 'react';
import { Switch, Text, TextInput, View } from 'react-native';
import { DEFAULT_EXAM } from '@/core/config';
import type { QuestionSet } from '@/core/schema';
import type { Attempt, RunMode, RunOverrides } from '@/core/types';
import { Button } from './Button';
import { Card } from './Card';
import { formatDate, formatPercent } from './format';
import { Screen } from './Screen';
import { radius, spacing, type, useTheme } from './theme';

export function SetDetailView({
  set,
  attempts,
  onStart,
  onDelete,
  onOpenAttempt,
}: {
  set: QuestionSet;
  attempts: Attempt[];
  onStart: (mode: RunMode, overrides: RunOverrides) => void;
  onDelete?: () => void;
  onOpenAttempt: (attemptId: string) => void;
}) {
  const theme = useTheme();
  const total = set.questions.length;

  const [count, setCount] = useState(String(set.exam?.questionCount ?? total));
  const [limit, setLimit] = useState(
    set.exam?.timeLimitMinutes === undefined ? '' : String(set.exam.timeLimitMinutes),
  );
  const [shuffleQuestions, setShuffleQuestions] = useState(
    set.exam?.shuffleQuestions ?? DEFAULT_EXAM.shuffleQuestions,
  );
  const [shuffleOptions, setShuffleOptions] = useState(
    set.exam?.shuffleOptions ?? DEFAULT_EXAM.shuffleOptions,
  );

  const requested = Number.parseInt(count, 10);
  const overCount = Number.isFinite(requested) && requested > total;

  const startMock = () => {
    const parsedLimit = Number.parseInt(limit, 10);
    onStart('mock', {
      questionCount: Number.isFinite(requested) ? requested : total,
      timeLimitMinutes: Number.isFinite(parsedLimit) ? parsedLimit : null,
      shuffleQuestions,
      shuffleOptions,
    });
  };

  const inputStyle = {
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: radius.sm,
    color: theme.text,
    backgroundColor: theme.surface,
    padding: spacing.sm,
    minWidth: 80,
  };

  return (
    <Screen>
      <View style={{ gap: spacing.xs }}>
        <Text style={[type.title, { color: theme.text }]}>{set.title}</Text>
        {set.description ? (
          <Text style={[type.body, { color: theme.textMuted }]}>{set.description}</Text>
        ) : null}
        <Text style={[type.caption, { color: theme.textMuted }]}>
          {`${total} questions${set.version ? ` · version ${set.version}` : ''}`}
        </Text>
      </View>

      {set.topics?.length ? (
        <Card>
          <Text style={[type.label, { color: theme.text }]}>Topics</Text>
          {set.topics.map((topic) => (
            <Text key={topic.id} style={[type.caption, { color: theme.textMuted }]}>
              {topic.name}
            </Text>
          ))}
        </Card>
      ) : null}

      <Card>
        <Text style={[type.heading, { color: theme.text }]}>Mock test</Text>
        <Text style={[type.caption, { color: theme.textMuted }]}>
          Timed, no feedback until you submit.
        </Text>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <Text style={[type.body, { color: theme.text, flex: 1 }]}>Questions</Text>
          <TextInput
            testID="question-count-input"
            value={count}
            onChangeText={setCount}
            keyboardType="number-pad"
            style={inputStyle}
          />
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <Text style={[type.body, { color: theme.text, flex: 1 }]}>Time limit (minutes)</Text>
          <TextInput
            testID="time-limit-input"
            value={limit}
            onChangeText={setLimit}
            placeholder="none"
            placeholderTextColor={theme.textMuted}
            keyboardType="number-pad"
            style={inputStyle}
          />
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <Text style={[type.body, { color: theme.text, flex: 1 }]}>Shuffle questions</Text>
          <Switch testID="shuffle-questions" value={shuffleQuestions} onValueChange={setShuffleQuestions} />
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <Text style={[type.body, { color: theme.text, flex: 1 }]}>Shuffle options</Text>
          <Switch testID="shuffle-options" value={shuffleOptions} onValueChange={setShuffleOptions} />
        </View>

        {overCount ? (
          <Text style={[type.caption, { color: theme.textMuted }]}>
            {`This set only has ${total} questions, so all ${total} will be used.`}
          </Text>
        ) : null}

        <Button title="Start mock test" onPress={startMock} testID="start-mock" />
      </Card>

      <Card>
        <Text style={[type.heading, { color: theme.text }]}>Practice</Text>
        <Text style={[type.caption, { color: theme.textMuted }]}>
          Every question, one at a time, with the explanation after each answer.
        </Text>
        <Button
          title="Start practice"
          variant="secondary"
          onPress={() => onStart('practice', {})}
          testID="start-practice"
        />
      </Card>

      {attempts.length > 0 ? (
        <View style={{ gap: spacing.sm }}>
          <Text style={[type.heading, { color: theme.text }]}>Past attempts</Text>
          {attempts.map((attempt) => (
            <Card
              key={attempt.id}
              testID={`attempt-${attempt.id}`}
              onPress={() => onOpenAttempt(attempt.id)}
            >
              <Text style={[type.body, { color: theme.text }]}>
                {`${attempt.mode === 'mock' ? 'Mock test' : 'Practice'} · ${formatPercent(attempt.score.percent)}`}
              </Text>
              <Text style={[type.caption, { color: theme.textMuted }]}>
                {formatDate(attempt.finishedAt)}
              </Text>
            </Card>
          ))}
        </View>
      ) : null}

      {onDelete ? (
        <Button title="Delete this set" variant="danger" onPress={onDelete} testID="delete-set" />
      ) : null}
    </Screen>
  );
}
