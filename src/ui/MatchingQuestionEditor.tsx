// src/ui/MatchingQuestionEditor.tsx
import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import type { MatchingQuestion, Topic } from '@/core/schema';
import { nextSequentialId } from '@/core/id';
import { Button } from './Button';
import { QuestionMetaFields } from './QuestionMetaFields';
import { radius, spacing, type, useTheme } from './theme';

export function MatchingQuestionEditor({
  question,
  topics,
  onChange,
}: {
  question: MatchingQuestion;
  topics: Topic[];
  onChange: (question: MatchingQuestion) => void;
}) {
  const theme = useTheme();
  const [selectedLeft, setSelectedLeft] = useState<string | null>(null);
  const inputStyle = {
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: radius.sm,
    color: theme.text,
    backgroundColor: theme.surface,
    padding: spacing.sm,
    flex: 1,
  };

  const setLeftText = (id: string, text: string) => {
    onChange({ ...question, left: question.left.map((i) => (i.id === id ? { ...i, text } : i)) });
  };

  const setRightText = (id: string, text: string) => {
    onChange({ ...question, right: question.right.map((i) => (i.id === id ? { ...i, text } : i)) });
  };

  const addLeft = () => {
    const id = nextSequentialId(question.left.map((i) => i.id), 'l');
    onChange({ ...question, left: [...question.left, { id, text: '' }] });
  };

  const addRight = () => {
    const id = nextSequentialId(question.right.map((i) => i.id), 'r');
    onChange({ ...question, right: [...question.right, { id, text: '' }] });
  };

  const removeLeft = (id: string) => {
    if (selectedLeft === id) setSelectedLeft(null);
    onChange({
      ...question,
      left: question.left.filter((i) => i.id !== id),
      pairs: question.pairs.filter((p) => p.left !== id),
    });
  };

  const removeRight = (id: string) => {
    onChange({
      ...question,
      right: question.right.filter((i) => i.id !== id),
      pairs: question.pairs.filter((p) => p.right !== id),
    });
  };

  const pressLeftChip = (id: string) => {
    setSelectedLeft(selectedLeft === id ? null : id);
  };

  const pressRightChip = (id: string) => {
    if (!selectedLeft) return;
    const withoutExisting = question.pairs.filter((p) => p.left !== selectedLeft);
    onChange({ ...question, pairs: [...withoutExisting, { left: selectedLeft, right: id }] });
    setSelectedLeft(null);
  };

  const removePair = (leftId: string) => {
    onChange({ ...question, pairs: question.pairs.filter((p) => p.left !== leftId) });
  };

  const leftText = new Map(question.left.map((i) => [i.id, i.text]));
  const rightText = new Map(question.right.map((i) => [i.id, i.text]));

  return (
    <View style={{ gap: spacing.md }}>
      <TextInput
        testID="matching-prompt"
        value={question.prompt}
        onChangeText={(prompt) => onChange({ ...question, prompt })}
        placeholder="Question prompt"
        placeholderTextColor={theme.textMuted}
        style={inputStyle}
        multiline
      />

      <View style={{ gap: spacing.sm }}>
        <Text style={[type.label, { color: theme.text }]}>Left items</Text>
        {question.left.map((item) => (
          <View
            key={item.id}
            testID={`left-row-${item.id}`}
            style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}
          >
            <TextInput
              testID={`left-text-${item.id}`}
              value={item.text}
              onChangeText={(text) => setLeftText(item.id, text)}
              placeholder="Left item text"
              placeholderTextColor={theme.textMuted}
              style={inputStyle}
            />
            <Button
              title="Remove"
              variant="danger"
              onPress={() => removeLeft(item.id)}
              testID={`left-remove-${item.id}`}
            />
          </View>
        ))}
        <Button title="Add left item" variant="secondary" onPress={addLeft} testID="add-left" />
      </View>

      <View style={{ gap: spacing.sm }}>
        <Text style={[type.label, { color: theme.text }]}>Right items</Text>
        {question.right.map((item) => (
          <View
            key={item.id}
            testID={`right-row-${item.id}`}
            style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}
          >
            <TextInput
              testID={`right-text-${item.id}`}
              value={item.text}
              onChangeText={(text) => setRightText(item.id, text)}
              placeholder="Right item text"
              placeholderTextColor={theme.textMuted}
              style={inputStyle}
            />
            <Button
              title="Remove"
              variant="danger"
              onPress={() => removeRight(item.id)}
              testID={`right-remove-${item.id}`}
            />
          </View>
        ))}
        <Button title="Add right item" variant="secondary" onPress={addRight} testID="add-right" />
      </View>

      <View style={{ gap: spacing.sm }}>
        <Text style={[type.label, { color: theme.text }]}>
          Pairs — tap a left item, then the right item it matches
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
          {question.left.map((item) => (
            <Pressable
              key={item.id}
              testID={`pair-left-chip-${item.id}`}
              accessibilityRole="button"
              accessibilityState={{ selected: selectedLeft === item.id }}
              onPress={() => pressLeftChip(item.id)}
              style={{
                padding: spacing.sm,
                borderRadius: radius.sm,
                borderWidth: selectedLeft === item.id ? 2 : 1,
                borderColor: selectedLeft === item.id ? theme.accent : theme.border,
              }}
            >
              <Text style={{ color: theme.text }}>{item.text || item.id}</Text>
            </Pressable>
          ))}
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
          {question.right.map((item) => (
            <Pressable
              key={item.id}
              testID={`pair-right-chip-${item.id}`}
              accessibilityRole="button"
              accessibilityState={{ disabled: !selectedLeft }}
              disabled={!selectedLeft}
              onPress={() => pressRightChip(item.id)}
              style={{
                padding: spacing.sm,
                borderRadius: radius.sm,
                borderWidth: 1,
                borderColor: theme.border,
                opacity: selectedLeft ? 1 : 0.5,
              }}
            >
              <Text style={{ color: theme.text }}>{item.text || item.id}</Text>
            </Pressable>
          ))}
        </View>

        {question.pairs.map((pair) => (
          <View
            key={pair.left}
            testID={`pair-row-${pair.left}`}
            style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}
          >
            <Text style={[type.body, { color: theme.text }]}>
              {`${leftText.get(pair.left) ?? pair.left} → ${rightText.get(pair.right) ?? pair.right}`}
            </Text>
            <Button
              title="Remove pair"
              variant="danger"
              onPress={() => removePair(pair.left)}
              testID={`pair-remove-${pair.left}`}
            />
          </View>
        ))}
      </View>

      <QuestionMetaFields
        topics={topics}
        topicId={question.topicId}
        difficulty={question.difficulty}
        explanation={question.explanation}
        onChangeTopicId={(topicId) => onChange({ ...question, topicId })}
        onChangeDifficulty={(difficulty) => onChange({ ...question, difficulty })}
        onChangeExplanation={(explanation) => onChange({ ...question, explanation })}
      />
    </View>
  );
}
