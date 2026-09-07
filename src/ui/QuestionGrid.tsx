import { Pressable, Text, View } from 'react-native';
import type { SessionState } from '@/core/types';
import { radius, spacing, type, useTheme } from './theme';

export function QuestionGrid({
  state,
  onGoto,
}: {
  state: SessionState;
  onGoto: (index: number) => void;
}) {
  const theme = useTheme();

  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
      {state.questionIds.map((questionId, index) => {
        const answered = (state.answers[questionId] ?? []).length > 0;
        const current = index === state.index;
        const label = [
          `Question ${index + 1}`,
          answered ? 'answered' : 'unanswered',
          current ? 'current' : null,
        ]
          .filter(Boolean)
          .join(', ');

        return (
          <Pressable
            key={questionId}
            testID={`grid-cell-${index}`}
            accessibilityRole="button"
            accessibilityLabel={label}
            onPress={() => onGoto(index)}
            style={{
              width: 40,
              height: 40,
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: radius.sm,
              borderWidth: current ? 2 : 1,
              borderColor: current ? theme.accent : theme.border,
              backgroundColor: answered ? theme.surfaceAlt : theme.surface,
            }}
          >
            <Text style={[type.caption, { color: theme.text }]}>{index + 1}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
