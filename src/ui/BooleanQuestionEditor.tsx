import { Text, TextInput, View } from 'react-native';
import type { BooleanQuestion } from '@/core/schema';
import { Button } from './Button';
import { radius, spacing, type, useTheme } from './theme';

export function BooleanQuestionEditor({
  question,
  onChange,
}: {
  question: BooleanQuestion;
  onChange: (question: BooleanQuestion) => void;
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

  const setLabel = (key: 'true' | 'false', text: string) => {
    const trueText = key === 'true' ? text : (question.labels?.true ?? '');
    const falseText = key === 'false' ? text : (question.labels?.false ?? '');
    if (trueText.trim() === '' || falseText.trim() === '') {
      onChange({ ...question, labels: undefined });
      return;
    }
    onChange({ ...question, labels: { true: trueText, false: falseText } });
  };

  return (
    <View style={{ gap: spacing.md }}>
      <TextInput
        testID="boolean-prompt"
        value={question.prompt}
        onChangeText={(prompt) => onChange({ ...question, prompt })}
        placeholder="Question prompt"
        placeholderTextColor={theme.textMuted}
        style={inputStyle}
        multiline
      />

      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        <Button
          title={question.labels?.true ?? 'True'}
          variant={question.answer ? 'primary' : 'secondary'}
          onPress={() => onChange({ ...question, answer: true })}
          testID="boolean-answer-true"
        />
        <Button
          title={question.labels?.false ?? 'False'}
          variant={!question.answer ? 'primary' : 'secondary'}
          onPress={() => onChange({ ...question, answer: false })}
          testID="boolean-answer-false"
        />
      </View>

      <View style={{ gap: spacing.sm }}>
        <Text style={[type.label, { color: theme.text }]}>Custom labels (optional)</Text>
        <TextInput
          testID="boolean-label-true"
          value={question.labels?.true ?? ''}
          onChangeText={(text) => setLabel('true', text)}
          placeholder="True"
          placeholderTextColor={theme.textMuted}
          style={inputStyle}
        />
        <TextInput
          testID="boolean-label-false"
          value={question.labels?.false ?? ''}
          onChangeText={(text) => setLabel('false', text)}
          placeholder="False"
          placeholderTextColor={theme.textMuted}
          style={inputStyle}
        />
      </View>
    </View>
  );
}
