import { Image, Pressable, Text, View } from 'react-native';
import type { Question } from '@/core/schema';
import { Card } from './Card';
import { MatchingInput } from './MatchingInput';
import { OrderingInput } from './OrderingInput';
import { radius, spacing, type, useTheme, type Theme } from './theme';

type Choice = { id: string; text: string; correct: boolean };

export function QuestionCard({
  question,
  response,
  revealed,
  optionOrder,
  itemOrder = [],
  onChange,
}: {
  question: Question;
  response: string[];
  revealed: boolean;
  optionOrder: string[];
  itemOrder?: string[];
  onChange: (response: string[]) => void;
}) {
  const theme = useTheme();

  if (question.type === 'ordering') {
    return (
      <Card>
        <Text style={[type.body, { color: theme.text }]}>{question.prompt}</Text>
        <OrderingInput
          question={question}
          response={response}
          revealed={revealed}
          initialOrder={itemOrder.length > 0 ? itemOrder : question.items.map((i) => i.id)}
          onChange={onChange}
        />
      </Card>
    );
  }

  if (question.type === 'matching') {
    return (
      <Card>
        <Text style={[type.body, { color: theme.text }]}>{question.prompt}</Text>
        <MatchingInput
          question={question}
          response={response}
          revealed={revealed}
          onChange={onChange}
        />
      </Card>
    );
  }

  return (
    <Card>
      <Text style={[type.body, { color: theme.text }]}>{question.prompt}</Text>

      {question.media ? (
        <Image
          accessibilityLabel={question.media.alt}
          source={{ uri: question.media.source }}
          style={{ width: '100%', height: 180, borderRadius: radius.md }}
          resizeMode="contain"
        />
      ) : null}

      <ChoiceList
        question={question}
        response={response}
        revealed={revealed}
        optionOrder={optionOrder}
        onChange={onChange}
        theme={theme}
      />
    </Card>
  );
}

function ChoiceList({
  question,
  response,
  revealed,
  optionOrder,
  onChange,
  theme,
}: {
  question: Question;
  response: string[];
  revealed: boolean;
  optionOrder: string[];
  onChange: (response: string[]) => void;
  theme: Theme;
}) {
  const choices = toChoices(question, optionOrder);

  if (choices === null) {
    return (
      <View testID="unsupported-question" style={{ paddingVertical: spacing.sm }}>
        <Text style={[type.caption, { color: theme.textMuted }]}>
          This question type is not supported in this version of the app, and is scored as skipped.
        </Text>
      </View>
    );
  }

  const press = (id: string) => {
    if (revealed) return;
    if (question.type === 'multi') {
      onChange(response.includes(id) ? response.filter((r) => r !== id) : [...response, id]);
      return;
    }
    onChange([id]);
  };

  return (
    <View style={{ gap: spacing.sm, marginTop: spacing.sm }}>
      {choices.map((choice) => {
        const selected = response.includes(choice.id);
        const border = revealed
          ? choice.correct
            ? theme.positive
            : selected
              ? theme.negative
              : theme.border
          : selected
            ? theme.accent
            : theme.border;
        const background = revealed
          ? choice.correct
            ? theme.positiveSurface
            : selected
              ? theme.negativeSurface
              : theme.surface
          : theme.surface;

        return (
          <Pressable
            key={choice.id}
            testID={`option-${choice.id}`}
            accessibilityRole={question.type === 'multi' ? 'checkbox' : 'radio'}
            accessibilityState={{ checked: selected, disabled: revealed }}
            disabled={revealed}
            onPress={() => press(choice.id)}
            style={{
              borderWidth: selected || revealed ? 2 : 1,
              borderColor: border,
              backgroundColor: background,
              borderRadius: radius.md,
              padding: spacing.md,
            }}
          >
            <Text style={[type.body, { color: theme.text }]}>{choice.text}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Returns null for types this version cannot render yet. */
function toChoices(question: Question, optionOrder: string[]): Choice[] | null {
  if (question.type === 'single' || question.type === 'multi') {
    const byId = new Map(question.options.map((o) => [o.id, o]));
    const ids = optionOrder.length > 0 ? optionOrder : question.options.map((o) => o.id);
    return ids
      .map((id) => byId.get(id))
      .filter((o): o is NonNullable<typeof o> => o !== undefined)
      .map((o) => ({ id: o.id, text: o.text, correct: o.correct }));
  }

  if (question.type === 'boolean') {
    return [
      { id: 'true', text: question.labels?.true ?? 'True', correct: question.answer },
      { id: 'false', text: question.labels?.false ?? 'False', correct: !question.answer },
    ];
  }

  return null;
}
