import { useEffect, useRef } from 'react';
import { Pressable, Text, View } from 'react-native';
import type { OrderingQuestion } from '@/core/schema';
import { radius, spacing, type, useTheme } from './theme';

export function OrderingInput({
  question,
  response,
  revealed,
  initialOrder,
  onChange,
}: {
  question: OrderingQuestion;
  response: string[];
  revealed: boolean;
  initialOrder: string[];
  onChange: (order: string[]) => void;
}) {
  const theme = useTheme();
  const itemText = new Map(question.items.map((item) => [item.id, item.text]));
  const order = response.length === question.items.length ? response : initialOrder;
  // Nothing was submitted for this question - review must not grade the rows.
  const unanswered = revealed && response.length === 0;
  const graded = revealed && !unanswered;

  // The presented order is itself an assertion: a user who agrees with it must be able to
  // submit without perturbing it first. Report it once per question so "did not touch
  // anything" means "the shown order is my answer", the way a real ordering item works.
  const seededFor = useRef<string | null>(null);
  useEffect(() => {
    if (revealed) return;
    if (seededFor.current === question.id) return;
    // Never overwrite an answer that is already there (resume, or a prior visit).
    if (response.length > 0) return;
    seededFor.current = question.id;
    onChange(initialOrder);
  }, [question.id, revealed, response.length, initialOrder, onChange]);

  const move = (index: number, delta: number) => {
    if (revealed) return;
    const target = index + delta;
    if (target < 0 || target >= order.length) return;
    const next = [...order];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };

  return (
    <View style={{ gap: spacing.sm, marginTop: spacing.sm }}>
      {order.map((itemId, index) => {
        const rightPlace = graded && question.correctOrder[index] === itemId;
        const label = [
          `${index + 1}. ${itemText.get(itemId) ?? itemId}`,
          unanswered ? 'not answered' : null,
          graded ? (rightPlace ? 'correct position' : 'wrong position') : null,
        ]
          .filter(Boolean)
          .join(', ');

        return (
          <View
            key={itemId}
            testID={`order-row-${itemId}`}
            accessibilityLabel={label}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.sm,
              padding: spacing.md,
              borderRadius: radius.md,
              borderWidth: graded ? 2 : 1,
              borderColor: graded
                ? rightPlace
                  ? theme.positive
                  : theme.negative
                : theme.border,
              backgroundColor: graded
                ? rightPlace
                  ? theme.positiveSurface
                  : theme.negativeSurface
                : theme.surface,
            }}
          >
            <Text style={[type.label, { color: theme.textMuted }]}>{index + 1}</Text>
            <Text style={[type.body, { color: theme.text, flex: 1 }]}>
              {itemText.get(itemId) ?? itemId}
            </Text>
            <MoveButton
              testID={`move-up-${itemId}`}
              label="Move up"
              glyph="▲"
              disabled={revealed || index === 0}
              onPress={() => move(index, -1)}
            />
            <MoveButton
              testID={`move-down-${itemId}`}
              label="Move down"
              glyph="▼"
              disabled={revealed || index === order.length - 1}
              onPress={() => move(index, 1)}
            />
          </View>
        );
      })}
    </View>
  );
}

function MoveButton({
  testID,
  label,
  glyph,
  disabled,
  onPress,
}: {
  testID: string;
  label: string;
  glyph: string;
  disabled: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={{
        padding: spacing.sm,
        borderRadius: radius.sm,
        borderWidth: 1,
        borderColor: theme.border,
        opacity: disabled ? 0.35 : 1,
      }}
    >
      <Text style={{ color: theme.text }}>{glyph}</Text>
    </Pressable>
  );
}
