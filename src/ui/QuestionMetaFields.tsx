import { Pressable, Text, TextInput, View } from 'react-native';
import type { Topic } from '@/core/schema';
import { radius, spacing, type, useTheme } from './theme';

type Difficulty = 'easy' | 'medium' | 'hard';

const DIFFICULTIES: { value: Difficulty; label: string }[] = [
  { value: 'easy', label: 'Easy' },
  { value: 'medium', label: 'Medium' },
  { value: 'hard', label: 'Hard' },
];

export function QuestionMetaFields({
  topics,
  topicId,
  difficulty,
  explanation,
  onChangeTopicId,
  onChangeDifficulty,
  onChangeExplanation,
}: {
  topics: Topic[];
  topicId: string | undefined;
  difficulty: Difficulty | undefined;
  explanation: string | undefined;
  onChangeTopicId: (topicId: string | undefined) => void;
  onChangeDifficulty: (difficulty: Difficulty | undefined) => void;
  onChangeExplanation: (explanation: string | undefined) => void;
}) {
  const theme = useTheme();
  const inputStyle = {
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: radius.sm,
    color: theme.text,
    backgroundColor: theme.surface,
    padding: spacing.sm,
  };

  const chipStyle = (selected: boolean) => ({
    padding: spacing.sm,
    borderRadius: radius.sm,
    borderWidth: selected ? 2 : 1,
    borderColor: selected ? theme.accent : theme.border,
    backgroundColor: selected ? theme.accent : theme.surface,
  });

  const chipTextColor = (selected: boolean) => (selected ? theme.accentText : theme.text);

  return (
    <View style={{ gap: spacing.md }}>
      {topics.length > 0 ? (
        <View style={{ gap: spacing.sm }}>
          <Text style={[type.label, { color: theme.text }]}>Topic</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
            {topics.map((topic) => {
              const selected = topicId === topic.id;
              return (
                <Pressable
                  key={topic.id}
                  testID={`topic-chip-${topic.id}`}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  onPress={() => onChangeTopicId(selected ? undefined : topic.id)}
                  style={chipStyle(selected)}
                >
                  <Text style={{ color: chipTextColor(selected) }}>{topic.name}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : null}

      <View style={{ gap: spacing.sm }}>
        <Text style={[type.label, { color: theme.text }]}>Difficulty (optional)</Text>
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          {DIFFICULTIES.map(({ value, label }) => {
            const selected = difficulty === value;
            return (
              <Pressable
                key={value}
                testID={`difficulty-${value}`}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                onPress={() => onChangeDifficulty(selected ? undefined : value)}
                style={chipStyle(selected)}
              >
                <Text style={{ color: chipTextColor(selected) }}>{label}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <TextInput
        testID="question-explanation"
        value={explanation ?? ''}
        onChangeText={(text) => onChangeExplanation(text || undefined)}
        placeholder="Explanation (optional)"
        placeholderTextColor={theme.textMuted}
        style={inputStyle}
        multiline
      />
    </View>
  );
}
