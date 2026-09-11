import { Switch, Text, TextInput, View } from 'react-native';
import type { ChoiceQuestion, Topic } from '@/core/schema';
import { nextSequentialId } from '@/core/id';
import { Button } from './Button';
import { radius, spacing, type, useTheme } from './theme';

export function ChoiceQuestionEditor({
  question,
  topics,
  onChange,
}: {
  question: ChoiceQuestion;
  topics: Topic[];
  onChange: (question: ChoiceQuestion) => void;
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

  const setOptionText = (id: string, text: string) => {
    onChange({
      ...question,
      options: question.options.map((o) => (o.id === id ? { ...o, text } : o)),
    });
  };

  const setOptionCorrect = (id: string, correct: boolean) => {
    onChange({
      ...question,
      options: question.options.map((o) => (o.id === id ? { ...o, correct } : o)),
    });
  };

  const addOption = () => {
    const id = nextSequentialId(question.options.map((o) => o.id), 'o');
    onChange({ ...question, options: [...question.options, { id, text: '', correct: false }] });
  };

  const removeOption = (id: string) => {
    onChange({ ...question, options: question.options.filter((o) => o.id !== id) });
  };

  return (
    <View style={{ gap: spacing.md }}>
      <TextInput
        testID="choice-prompt"
        value={question.prompt}
        onChangeText={(prompt) => onChange({ ...question, prompt })}
        placeholder="Question prompt"
        placeholderTextColor={theme.textMuted}
        style={inputStyle}
        multiline
      />

      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        <Button
          title="Single answer"
          variant={question.type === 'single' ? 'primary' : 'secondary'}
          onPress={() => onChange({ ...question, type: 'single' })}
          testID="choice-type-single"
        />
        <Button
          title="Multiple answers"
          variant={question.type === 'multi' ? 'primary' : 'secondary'}
          onPress={() => onChange({ ...question, type: 'multi' })}
          testID="choice-type-multi"
        />
      </View>

      <View style={{ gap: spacing.sm }}>
        <Text style={[type.label, { color: theme.text }]}>Options</Text>
        {question.options.map((option) => (
          <View
            key={option.id}
            testID={`option-row-${option.id}`}
            style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}
          >
            <TextInput
              testID={`option-text-${option.id}`}
              value={option.text}
              onChangeText={(text) => setOptionText(option.id, text)}
              placeholder="Option text"
              placeholderTextColor={theme.textMuted}
              style={[inputStyle, { flex: 1 }]}
            />
            <Switch
              testID={`option-correct-${option.id}`}
              value={option.correct}
              onValueChange={(correct) => setOptionCorrect(option.id, correct)}
            />
            <Button
              title="Remove"
              variant="danger"
              onPress={() => removeOption(option.id)}
              testID={`option-remove-${option.id}`}
            />
          </View>
        ))}
        <Button title="Add option" variant="secondary" onPress={addOption} testID="add-option" />
      </View>

      {topics.length > 0 ? (
        <View style={{ gap: spacing.sm }}>
          <Text style={[type.label, { color: theme.text }]}>Topic</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
            {topics.map((topic) => (
              <Button
                key={topic.id}
                title={topic.name}
                variant={question.topicId === topic.id ? 'primary' : 'secondary'}
                onPress={() =>
                  onChange({
                    ...question,
                    topicId: question.topicId === topic.id ? undefined : topic.id,
                  })
                }
                testID={`topic-chip-${topic.id}`}
              />
            ))}
          </View>
        </View>
      ) : null}

      <TextInput
        testID="choice-explanation"
        value={question.explanation ?? ''}
        onChangeText={(text) => onChange({ ...question, explanation: text || undefined })}
        placeholder="Explanation (optional)"
        placeholderTextColor={theme.textMuted}
        style={inputStyle}
        multiline
      />
    </View>
  );
}
