import { Linking, Pressable, Text, View } from 'react-native';
import type { Question } from '@/core/schema';
import { isCorrect } from '@/core/scoring';
import { radius, spacing, type, useTheme } from './theme';

export function Feedback({ question, response }: { question: Question; response: string[] }) {
  const theme = useTheme();
  const correct = isCorrect(question, response);

  // Spec §3.4: chosen-wrong explanation, then the correct one, then the question's own.
  const chosenWrong =
    question.type === 'single' || question.type === 'multi'
      ? question.options.filter((o) => response.includes(o.id) && !o.correct)
      : [];
  const correctOptions =
    question.type === 'single' || question.type === 'multi'
      ? question.options.filter((o) => o.correct)
      : [];

  return (
    <View
      testID="feedback"
      style={{
        backgroundColor: correct ? theme.positiveSurface : theme.negativeSurface,
        borderRadius: radius.md,
        padding: spacing.md,
        gap: spacing.sm,
      }}
    >
      <Text style={[type.label, { color: correct ? theme.positive : theme.negative }]}>
        {correct ? 'Correct' : 'Incorrect'}
      </Text>

      {chosenWrong.map((option) =>
        option.explanation ? (
          <Text key={`wrong-${option.id}`} style={[type.body, { color: theme.text }]}>
            {`${option.text}: ${option.explanation}`}
          </Text>
        ) : null,
      )}

      {!correct
        ? correctOptions.map((option) =>
            option.explanation ? (
              <Text key={`right-${option.id}`} style={[type.body, { color: theme.text }]}>
                {`${option.text}: ${option.explanation}`}
              </Text>
            ) : null,
          )
        : null}

      {question.explanation ? (
        <Text style={[type.body, { color: theme.text }]}>{question.explanation}</Text>
      ) : null}

      {question.reference ? (
        <Pressable
          testID="reference-link"
          accessibilityRole="link"
          onPress={() => Linking.openURL(question.reference!.url)}
        >
          <Text style={[type.caption, { color: theme.accent }]}>{question.reference.label}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
