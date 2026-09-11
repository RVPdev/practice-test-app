import { Pressable, Text, TextInput, View } from 'react-native';
import type { OrderingQuestion } from '@/core/schema';
import { nextSequentialId } from '@/core/id';
import { Button } from './Button';
import { radius, spacing, type, useTheme } from './theme';

export function OrderingQuestionEditor({
  question,
  onChange,
}: {
  question: OrderingQuestion;
  onChange: (question: OrderingQuestion) => void;
}) {
  const theme = useTheme();
  const inputStyle = {
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: radius.sm,
    color: theme.text,
    backgroundColor: theme.surface,
    padding: spacing.sm,
    flex: 1,
  };

  const applyItems = (items: OrderingQuestion['items']) => {
    onChange({ ...question, items, correctOrder: items.map((item) => item.id) });
  };

  const setItemText = (id: string, text: string) => {
    applyItems(question.items.map((item) => (item.id === id ? { ...item, text } : item)));
  };

  const addItem = () => {
    const id = nextSequentialId(question.items.map((i) => i.id), 'i');
    applyItems([...question.items, { id, text: '' }]);
  };

  const removeItem = (id: string) => {
    applyItems(question.items.filter((item) => item.id !== id));
  };

  const move = (index: number, delta: number) => {
    const target = index + delta;
    if (target < 0 || target >= question.items.length) return;
    const next = [...question.items];
    [next[index], next[target]] = [next[target], next[index]];
    applyItems(next);
  };

  return (
    <View style={{ gap: spacing.md }}>
      <TextInput
        testID="ordering-prompt"
        value={question.prompt}
        onChangeText={(prompt) => onChange({ ...question, prompt })}
        placeholder="Question prompt"
        placeholderTextColor={theme.textMuted}
        style={inputStyle}
        multiline
      />

      <View style={{ gap: spacing.sm }}>
        <Text style={[type.label, { color: theme.text }]}>Items, in the correct order</Text>
        {question.items.map((item, index) => (
          <View
            key={item.id}
            testID={`ordering-row-${item.id}`}
            style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}
          >
            <Text style={[type.label, { color: theme.textMuted }]}>{index + 1}</Text>
            <TextInput
              testID={`ordering-text-${item.id}`}
              value={item.text}
              onChangeText={(text) => setItemText(item.id, text)}
              placeholder="Item text"
              placeholderTextColor={theme.textMuted}
              style={inputStyle}
            />
            <Pressable
              testID={`ordering-move-up-${item.id}`}
              accessibilityRole="button"
              accessibilityState={{ disabled: index === 0 }}
              disabled={index === 0}
              onPress={() => move(index, -1)}
              style={{ padding: spacing.sm, opacity: index === 0 ? 0.35 : 1 }}
            >
              <Text style={{ color: theme.text }}>▲</Text>
            </Pressable>
            <Pressable
              testID={`ordering-move-down-${item.id}`}
              accessibilityRole="button"
              accessibilityState={{ disabled: index === question.items.length - 1 }}
              disabled={index === question.items.length - 1}
              onPress={() => move(index, 1)}
              style={{ padding: spacing.sm, opacity: index === question.items.length - 1 ? 0.35 : 1 }}
            >
              <Text style={{ color: theme.text }}>▼</Text>
            </Pressable>
            <Button
              title="Remove"
              variant="danger"
              onPress={() => removeItem(item.id)}
              testID={`ordering-remove-${item.id}`}
            />
          </View>
        ))}
        <Button title="Add item" variant="secondary" onPress={addItem} testID="add-ordering-item" />
      </View>
    </View>
  );
}
