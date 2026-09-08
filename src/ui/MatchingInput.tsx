import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import type { MatchingQuestion } from '@/core/schema';
import { radius, spacing, type, useTheme } from './theme';

const parse = (response: string[]) =>
  new Map(
    response
      .map((entry) => entry.split(':'))
      .filter((parts) => parts.length === 2)
      .map(([left, right]) => [left, right] as const),
  );

const serialise = (pairs: Map<string, string>) =>
  [...pairs.entries()].map(([left, right]) => `${left}:${right}`);

export function MatchingInput({
  question,
  response,
  revealed,
  onChange,
}: {
  question: MatchingQuestion;
  response: string[];
  revealed: boolean;
  onChange: (pairs: string[]) => void;
}) {
  const theme = useTheme();
  const [selectedLeft, setSelectedLeft] = useState<string | null>(null);
  const pairs = parse(response);
  const expected = parse(question.pairs.map((p) => `${p.left}:${p.right}`));
  const rightText = new Map(question.right.map((item) => [item.id, item.text]));

  const pressLeft = (leftId: string) => {
    if (revealed) return;
    if (pairs.has(leftId) && selectedLeft !== leftId) {
      setSelectedLeft(leftId);
      return;
    }
    if (pairs.has(leftId)) {
      const next = new Map(pairs);
      next.delete(leftId);
      setSelectedLeft(null);
      onChange(serialise(next));
      return;
    }
    setSelectedLeft(selectedLeft === leftId ? null : leftId);
  };

  const pressRight = (rightId: string) => {
    if (revealed || !selectedLeft) return;
    const next = new Map(pairs);
    next.set(selectedLeft, rightId);
    setSelectedLeft(null);
    onChange(serialise(next));
  };

  return (
    <View style={{ gap: spacing.md, marginTop: spacing.sm }}>
      <View style={{ gap: spacing.sm }}>
        {question.left.map((item) => {
          const pairedTo = pairs.get(item.id);
          const right = pairedTo ? (rightText.get(pairedTo) ?? pairedTo) : null;
          const correct = revealed && pairedTo === expected.get(item.id);
          const label = [
            item.text,
            right ? `paired with ${right}` : 'not paired',
            revealed ? (correct ? 'correct' : 'incorrect') : null,
          ]
            .filter(Boolean)
            .join(', ');

          return (
            <Pressable
              key={item.id}
              testID={`left-${item.id}`}
              accessibilityRole="button"
              accessibilityLabel={label}
              accessibilityState={{ selected: selectedLeft === item.id, disabled: revealed }}
              disabled={revealed}
              onPress={() => pressLeft(item.id)}
              style={{
                padding: spacing.md,
                borderRadius: radius.md,
                borderWidth: selectedLeft === item.id || revealed ? 2 : 1,
                borderColor: revealed
                  ? correct
                    ? theme.positive
                    : theme.negative
                  : selectedLeft === item.id
                    ? theme.accent
                    : theme.border,
                backgroundColor: revealed
                  ? correct
                    ? theme.positiveSurface
                    : theme.negativeSurface
                  : theme.surface,
              }}
            >
              <Text style={[type.body, { color: theme.text }]}>{item.text}</Text>
              <Text style={[type.caption, { color: theme.textMuted }]}>
                {right ?? 'Tap, then choose a match below'}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={{ gap: spacing.sm }}>
        {question.right.map((item) => (
          <Pressable
            key={item.id}
            testID={`right-${item.id}`}
            accessibilityRole="button"
            accessibilityState={{ disabled: revealed || selectedLeft === null }}
            disabled={revealed || selectedLeft === null}
            onPress={() => pressRight(item.id)}
            style={{
              padding: spacing.md,
              borderRadius: radius.md,
              borderWidth: 1,
              borderColor: theme.border,
              backgroundColor: theme.surfaceAlt,
              opacity: revealed || selectedLeft === null ? 0.6 : 1,
            }}
          >
            <Text style={[type.body, { color: theme.text }]}>{item.text}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
