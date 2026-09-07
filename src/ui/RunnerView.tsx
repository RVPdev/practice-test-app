import { Text, View } from 'react-native';
import type { Question } from '@/core/schema';
import { isRevealed } from '@/core/session';
import type { SessionState } from '@/core/types';
import { Button } from './Button';
import { Feedback } from './Feedback';
import { formatClock } from './format';
import { ProgressBar } from './ProgressBar';
import { QuestionCard } from './QuestionCard';
import { Screen } from './Screen';
import { spacing, type, useTheme } from './theme';

export function RunnerView({
  state,
  question,
  optionOrder,
  remaining,
  onAnswer,
  onReveal,
  onNext,
  onPrev,
  onSubmit,
}: {
  state: SessionState;
  question: Question;
  optionOrder: string[];
  remaining: number | null;
  onAnswer: (response: string[]) => void;
  onReveal: () => void;
  onNext: () => void;
  onPrev: () => void;
  onSubmit: () => void;
}) {
  const theme = useTheme();
  const total = state.questionIds.length;
  const position = state.index + 1;
  const response = state.answers[question.id] ?? [];
  const revealed = isRevealed(state, question.id);
  const isLast = state.index === total - 1;
  const practice = state.mode === 'practice';

  return (
    <Screen>
      <View style={{ gap: spacing.sm }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={[type.label, { color: theme.textMuted, flex: 1 }]}>
            {`Question ${position} of ${total}`}
          </Text>
          {remaining !== null ? (
            <Text
              testID="timer"
              style={[
                type.mono,
                { color: remaining <= 60_000 ? theme.negative : theme.text },
              ]}
            >
              {formatClock(remaining)}
            </Text>
          ) : null}
        </View>
        <ProgressBar fraction={position / total} />
      </View>

      <QuestionCard
        question={question}
        response={response}
        revealed={revealed}
        optionOrder={optionOrder}
        onChange={onAnswer}
      />

      {revealed ? <Feedback question={question} response={response} /> : null}

      {practice ? (
        revealed ? (
          isLast ? (
            <Button title="Finish" onPress={onSubmit} testID="finish" />
          ) : (
            <Button title="Next" onPress={onNext} testID="next" />
          )
        ) : (
          <Button
            title="Submit answer"
            onPress={onReveal}
            disabled={response.length === 0}
            testID="reveal"
          />
        )
      ) : (
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <View style={{ flex: 1 }}>
            <Button
              title="Back"
              variant="secondary"
              onPress={onPrev}
              disabled={state.index === 0}
              testID="prev"
            />
          </View>
          <View style={{ flex: 1 }}>
            {isLast ? (
              <Button title="Submit test" onPress={onSubmit} testID="submit" />
            ) : (
              <Button title="Next" onPress={onNext} testID="next" />
            )}
          </View>
        </View>
      )}
    </Screen>
  );
}
