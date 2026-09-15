import { useEffect, useRef } from 'react';
import { Platform, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  type SharedValue,
} from 'react-native-reanimated';
import type { OrderingQuestion } from '@/core/schema';
import { reorder } from '@/core/ordering';
import { radius, spacing, type, useTheme } from './theme';

const ROW_HEIGHT = 56;

function clamp(value: number, min: number, max: number) {
  'worklet';
  return Math.min(Math.max(value, min), max);
}

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

  // The live drag order lives on a shared value so dragging one row can reorder the rest on
  // the UI thread every frame without a React re-render. `onChange` only hears about the
  // result once a drag ends.
  const orderRef = useSharedValue<string[]>(order);
  const orderKey = order.join('|');
  useEffect(() => {
    orderRef.value = order;
  }, [orderKey]);

  return (
    <View style={{ height: order.length * ROW_HEIGHT, marginTop: spacing.sm }}>
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
          <Row
            key={itemId}
            id={itemId}
            index={index}
            text={itemText.get(itemId) ?? itemId}
            label={label}
            disabled={revealed}
            orderRef={orderRef}
            onChange={onChange}
            borderColor={graded ? (rightPlace ? theme.positive : theme.negative) : theme.border}
            backgroundColor={
              graded ? (rightPlace ? theme.positiveSurface : theme.negativeSurface) : theme.surface
            }
          />
        );
      })}
    </View>
  );
}

function Row({
  id,
  index,
  text,
  label,
  disabled,
  orderRef,
  onChange,
  borderColor,
  backgroundColor,
}: {
  id: string;
  index: number;
  text: string;
  label: string;
  disabled: boolean;
  orderRef: SharedValue<string[]>;
  onChange: (order: string[]) => void;
  borderColor: string;
  backgroundColor: string;
}) {
  const theme = useTheme();
  const translateY = useSharedValue(index * ROW_HEIGHT);
  const isDragging = useSharedValue(false);
  const startY = useSharedValue(0);

  useAnimatedReaction(
    () => orderRef.value.indexOf(id),
    (current, previous) => {
      if (current !== previous && !isDragging.value) {
        translateY.value = withSpring(current * ROW_HEIGHT);
      }
    },
  );

  const pan = Gesture.Pan()
    .enabled(!disabled)
    .onStart(() => {
      isDragging.value = true;
      startY.value = translateY.value;
    })
    .onUpdate((event) => {
      translateY.value = startY.value + event.translationY;
      const currentIndex = orderRef.value.indexOf(id);
      const targetIndex = clamp(
        Math.round(translateY.value / ROW_HEIGHT),
        0,
        orderRef.value.length - 1,
      );
      if (targetIndex !== currentIndex) {
        orderRef.value = reorder(orderRef.value, currentIndex, targetIndex);
      }
    })
    .onEnd(() => {
      isDragging.value = false;
      const finalIndex = orderRef.value.indexOf(id);
      translateY.value = withSpring(finalIndex * ROW_HEIGHT);
      runOnJS(onChange)(orderRef.value);
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }, { scale: isDragging.value ? 1.03 : 1 }],
    zIndex: isDragging.value ? 1 : 0,
    elevation: isDragging.value ? 4 : 0,
    // react-native-web deprecated the shadow* style props in favor of the CSS `boxShadow`
    // shorthand; native platforms still need shadow*, so branch on Platform.OS.
    ...(Platform.OS === 'web'
      ? { boxShadow: isDragging.value ? '0px 4px 8px rgba(0, 0, 0, 0.2)' : 'none' }
      : { shadowOpacity: isDragging.value ? 0.2 : 0, shadowRadius: 8 }),
  }));

  return (
    <GestureDetector gesture={pan}>
      <Animated.View
        testID={`order-row-${id}`}
        accessibilityLabel={label}
        accessibilityState={{ disabled }}
        style={[
          {
            position: 'absolute',
            left: 0,
            right: 0,
            height: ROW_HEIGHT - spacing.sm,
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.sm,
            paddingHorizontal: spacing.md,
            borderRadius: radius.md,
            borderWidth: 1,
            borderColor,
            backgroundColor,
          },
          animatedStyle,
        ]}
      >
        <Text style={[type.label, { color: theme.textMuted }]}>{index + 1}</Text>
        <Text numberOfLines={1} style={[type.body, { color: theme.text, flex: 1 }]}>
          {text}
        </Text>
      </Animated.View>
    </GestureDetector>
  );
}
