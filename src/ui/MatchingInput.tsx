import { useRef } from 'react';
import { Platform, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  type SharedValue,
} from 'react-native-reanimated';
import type { MatchingQuestion } from '@/core/schema';
import {
  clearPair,
  findSlotAt,
  parsePairs,
  serialisePairs,
  setPair,
  type Rect,
} from '@/core/matching';
import { radius, spacing, type, useTheme } from './theme';

// Read once at module scope so the worklet below closes over a plain boolean instead of
// the whole `Platform` object (whose other properties/getters reach into native modules
// and would otherwise be pulled into the worklet closure).
const IS_WEB = Platform.OS === 'web';

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
  const pairs = parsePairs(response);
  const expected = parsePairs(question.pairs.map((p) => `${p.left}:${p.right}`));
  const rightText = new Map(question.right.map((item) => [item.id, item.text]));
  const placedRightIds = new Set(pairs.values());
  const bank = question.right.filter((item) => !placedRightIds.has(item.id));

  const slotLayout = useSharedValue<Record<string, Rect>>({});
  const slotNodes = useRef<Record<string, View | null>>({});

  const measureSlot = (leftId: string) => {
    slotNodes.current[leftId]?.measure((_x, _y, width, height, pageX, pageY) => {
      slotLayout.value = { ...slotLayout.value, [leftId]: { pageX, pageY, width, height } };
    });
  };

  // `onLayout` only fires on a size change, not on scroll - and this component renders
  // inside a ScrollView (RunnerView -> Screen), so a cached rect goes stale the moment the
  // question scrolls. Re-measure every slot right as a drag starts instead of relying on
  // onLayout alone; `measure()` resolves well before a human finishes a drag gesture.
  const measureAll = () => {
    Object.keys(slotNodes.current).forEach(measureSlot);
  };

  const place = (leftId: string, rightId: string) => {
    onChange(serialisePairs(setPair(pairs, leftId, rightId)));
  };

  const returnToBank = (leftId: string) => {
    onChange(serialisePairs(clearPair(pairs, leftId)));
  };

  return (
    <View style={{ gap: spacing.lg, marginTop: spacing.sm }}>
      <View style={{ gap: spacing.sm }}>
        {question.left.map((item) => {
          const pairedRight = pairs.get(item.id);
          const correct = revealed && pairedRight === expected.get(item.id);
          const label = [
            item.text,
            pairedRight ? `paired with ${rightText.get(pairedRight) ?? pairedRight}` : 'not paired',
            revealed ? (correct ? 'correct' : 'incorrect') : null,
          ]
            .filter(Boolean)
            .join(', ');

          return (
            <View
              key={item.id}
              ref={(node) => {
                slotNodes.current[item.id] = node;
              }}
              onLayout={() => measureSlot(item.id)}
              testID={`left-${item.id}`}
              accessible
              accessibilityLabel={label}
              accessibilityState={{ disabled: revealed }}
              style={{
                // Bundled matching answers run up to ~165 characters - stacking the chip
                // under the label (instead of squeezing it into whatever room is left next
                // to a flex:1 label) keeps long answers legible instead of wrapped into a
                // tall, narrow column.
                flexDirection: pairedRight ? 'column' : 'row',
                alignItems: pairedRight ? 'flex-start' : 'center',
                gap: spacing.sm,
                padding: spacing.md,
                minHeight: 56,
                borderRadius: radius.md,
                borderWidth: revealed ? 2 : 1,
                borderColor: revealed ? (correct ? theme.positive : theme.negative) : theme.border,
                backgroundColor: revealed
                  ? correct
                    ? theme.positiveSurface
                    : theme.negativeSurface
                  : theme.surface,
              }}
            >
              <Text style={[type.body, { color: theme.text }, pairedRight ? null : { flex: 1 }]}>
                {item.text}
              </Text>
              {pairedRight ? (
                <DraggableAnswer
                  rightId={pairedRight}
                  text={rightText.get(pairedRight) ?? pairedRight}
                  sourceLeftId={item.id}
                  disabled={revealed}
                  slotLayout={slotLayout}
                  onPlace={place}
                  onReturnToBank={returnToBank}
                  onDragStart={measureAll}
                />
              ) : (
                <Text style={[type.caption, { color: theme.textMuted }]}>Drop answer here</Text>
              )}
            </View>
          );
        })}
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
        {bank.map((item) => (
          <DraggableAnswer
            key={item.id}
            rightId={item.id}
            text={item.text}
            sourceLeftId={null}
            disabled={revealed}
            slotLayout={slotLayout}
            onPlace={place}
            onReturnToBank={returnToBank}
            onDragStart={measureAll}
          />
        ))}
      </View>
    </View>
  );
}

function DraggableAnswer({
  rightId,
  text,
  sourceLeftId,
  disabled,
  slotLayout,
  onPlace,
  onReturnToBank,
  onDragStart,
}: {
  rightId: string;
  text: string;
  sourceLeftId: string | null;
  disabled: boolean;
  slotLayout: SharedValue<Record<string, Rect>>;
  onPlace: (leftId: string, rightId: string) => void;
  onReturnToBank: (leftId: string) => void;
  onDragStart: () => void;
}) {
  const theme = useTheme();
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const isDragging = useSharedValue(false);

  const pan = Gesture.Pan()
    .enabled(!disabled)
    .onStart(() => {
      isDragging.value = true;
      // Slot rects were last measured on layout, which never fires on scroll - refresh
      // them now so a drag started after scrolling still hit-tests correctly.
      runOnJS(onDragStart)();
    })
    .onUpdate((event) => {
      translateX.value = event.translationX;
      translateY.value = event.translationY;
    })
    .onEnd((event) => {
      isDragging.value = false;
      const hitLeftId = findSlotAt(slotLayout.value, event.absoluteX, event.absoluteY);
      translateX.value = withSpring(0);
      translateY.value = withSpring(0);
      if (hitLeftId) {
        runOnJS(onPlace)(hitLeftId, rightId);
      } else if (sourceLeftId) {
        runOnJS(onReturnToBank)(sourceLeftId);
      }
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: isDragging.value ? 1.05 : 1 },
    ],
    zIndex: isDragging.value ? 10 : 0,
    elevation: isDragging.value ? 6 : 0,
    // react-native-web deprecated the shadow* style props in favor of the CSS `boxShadow`
    // shorthand; native platforms still need shadow*.
    ...(IS_WEB
      ? { boxShadow: isDragging.value ? '0px 4px 8px rgba(0, 0, 0, 0.25)' : 'none' }
      : { shadowOpacity: isDragging.value ? 0.25 : 0, shadowRadius: 8 }),
  }));

  return (
    <GestureDetector gesture={pan}>
      <Animated.View
        testID={sourceLeftId ? `placed-${sourceLeftId}` : `right-${rightId}`}
        accessible
        accessibilityLabel={text}
        accessibilityState={{ disabled }}
        style={[
          {
            paddingVertical: spacing.sm,
            paddingHorizontal: spacing.md,
            borderRadius: radius.md,
            borderWidth: 1,
            borderColor: theme.border,
            backgroundColor: theme.surfaceAlt,
            // Bundled matching answers run up to ~165 characters - without an explicit
            // maxWidth, React Native's default flexShrink:0 lets a long chip overflow its
            // row/column container instead of wrapping.
            maxWidth: '100%',
            flexShrink: 1,
          },
          animatedStyle,
        ]}
      >
        <Text style={[type.body, { color: theme.text }]}>{text}</Text>
      </Animated.View>
    </GestureDetector>
  );
}
