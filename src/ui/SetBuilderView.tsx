// src/ui/SetBuilderView.tsx
import { useState } from 'react';
import { Switch, Text, TextInput, View } from 'react-native';
import type { Question, QuestionSet, QuestionType, Topic } from '@/core/schema';
import type { ValidationError } from '@/core/validate';
import { DEFAULT_EXAM } from '@/core/config';
import { makeSetId, nextSequentialId, uniqueSlug } from '@/core/id';
import { BooleanQuestionEditor } from './BooleanQuestionEditor';
import { Button } from './Button';
import { Card } from './Card';
import { ChoiceQuestionEditor } from './ChoiceQuestionEditor';
import { MatchingQuestionEditor } from './MatchingQuestionEditor';
import { OrderingQuestionEditor } from './OrderingQuestionEditor';
import { Screen } from './Screen';
import { radius, spacing, type, useTheme } from './theme';

const QUESTION_TYPES: { type: QuestionType; label: string }[] = [
  { type: 'single', label: 'Single choice' },
  { type: 'multi', label: 'Multiple choice' },
  { type: 'boolean', label: 'True / False' },
  { type: 'ordering', label: 'Ordering' },
  { type: 'matching', label: 'Matching' },
];

function emptySet(): QuestionSet {
  return {
    schemaVersion: 1,
    id: makeSetId('Untitled set'),
    title: '',
    language: 'en',
    topics: [],
    exam: { ...DEFAULT_EXAM },
    questions: [],
  };
}

function makeQuestion(questionType: QuestionType, id: string): Question {
  if (questionType === 'single' || questionType === 'multi') {
    return {
      id,
      type: questionType,
      prompt: '',
      options: [
        { id: 'o1', text: '', correct: false },
        { id: 'o2', text: '', correct: false },
      ],
    };
  }
  if (questionType === 'boolean') {
    return { id, type: 'boolean', prompt: '', answer: true };
  }
  if (questionType === 'ordering') {
    return {
      id,
      type: 'ordering',
      prompt: '',
      items: [
        { id: 'i1', text: '' },
        { id: 'i2', text: '' },
      ],
      correctOrder: ['i1', 'i2'],
    };
  }
  return {
    id,
    type: 'matching',
    prompt: '',
    left: [{ id: 'l1', text: '' }],
    right: [{ id: 'r1', text: '' }],
    pairs: [],
  };
}

function questionLabel(question: Question): string {
  return QUESTION_TYPES.find((t) => t.type === question.type)?.label ?? question.type;
}

export function SetBuilderView({
  initialSet,
  errors,
  saving,
  onSave,
  onCancel,
}: {
  initialSet: QuestionSet | null;
  errors: ValidationError[] | null;
  saving: boolean;
  onSave: (set: QuestionSet) => void;
  onCancel: () => void;
}) {
  const theme = useTheme();
  const [set, setSet] = useState<QuestionSet>(() => initialSet ?? emptySet());
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [showTypePicker, setShowTypePicker] = useState(false);
  const [topicName, setTopicName] = useState('');

  const inputStyle = {
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: radius.sm,
    color: theme.text,
    backgroundColor: theme.surface,
    padding: spacing.sm,
  };

  const topics = set.topics ?? [];

  const addTopic = (name: string) => {
    if (!name.trim()) return;
    const id = uniqueSlug(
      name,
      topics.map((t) => t.id),
    );
    setSet({ ...set, topics: [...topics, { id, name }] });
  };

  const removeTopic = (id: string) => {
    setSet({
      ...set,
      topics: topics.filter((t) => t.id !== id),
      questions: set.questions.map((q) => (q.topicId === id ? { ...q, topicId: undefined } : q)),
    });
  };

  const addQuestion = (questionType: QuestionType) => {
    const id = nextSequentialId(
      set.questions.map((q) => q.id),
      'q',
    );
    setSet({ ...set, questions: [...set.questions, makeQuestion(questionType, id)] });
    setEditingIndex(set.questions.length);
    setShowTypePicker(false);
  };

  const updateQuestion = (index: number, question: Question) => {
    setSet({ ...set, questions: set.questions.map((q, i) => (i === index ? question : q)) });
  };

  const removeQuestion = (index: number) => {
    setSet({ ...set, questions: set.questions.filter((_, i) => i !== index) });
    setEditingIndex(null);
  };

  const moveQuestion = (index: number, delta: number) => {
    const target = index + delta;
    if (target < 0 || target >= set.questions.length) return;
    const next = [...set.questions];
    [next[index], next[target]] = [next[target], next[index]];
    setSet({ ...set, questions: next });
  };

  return (
    <Screen>
      <Text style={[type.title, { color: theme.text }]}>{initialSet ? 'Edit set' : 'Create a set'}</Text>

      <TextInput
        testID="builder-title"
        value={set.title}
        onChangeText={(title) => setSet({ ...set, title })}
        placeholder="Set title"
        placeholderTextColor={theme.textMuted}
        style={inputStyle}
      />
      <TextInput
        testID="builder-description"
        value={set.description ?? ''}
        onChangeText={(description) => setSet({ ...set, description: description || undefined })}
        placeholder="Description (optional)"
        placeholderTextColor={theme.textMuted}
        style={inputStyle}
        multiline
      />

      <Card>
        <Text style={[type.heading, { color: theme.text }]}>Topics</Text>
        {topics.map((topic) => (
          <View
            key={topic.id}
            testID={`topic-row-${topic.id}`}
            style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}
          >
            <Text style={[type.body, { color: theme.text, flex: 1 }]}>{topic.name}</Text>
            <Button
              title="Remove"
              variant="danger"
              onPress={() => removeTopic(topic.id)}
              testID={`topic-remove-${topic.id}`}
            />
          </View>
        ))}
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <TextInput
            testID="new-topic-name"
            value={topicName}
            onChangeText={setTopicName}
            placeholder="New topic name"
            placeholderTextColor={theme.textMuted}
            style={[inputStyle, { flex: 1 }]}
          />
          <Button
            title="Add topic"
            variant="secondary"
            onPress={() => {
              addTopic(topicName);
              setTopicName('');
            }}
            testID="add-topic"
          />
        </View>
      </Card>

      <Card>
        <Text style={[type.heading, { color: theme.text }]}>Exam settings</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <Text style={[type.body, { color: theme.text, flex: 1 }]}>Question count</Text>
          <TextInput
            testID="builder-question-count"
            value={set.exam?.questionCount ? String(set.exam.questionCount) : ''}
            onChangeText={(text) => {
              const n = Number.parseInt(text, 10);
              setSet({
                ...set,
                exam: { ...set.exam, questionCount: Number.isFinite(n) ? n : undefined },
              });
            }}
            placeholder="all"
            placeholderTextColor={theme.textMuted}
            keyboardType="number-pad"
            style={inputStyle}
          />
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <Text style={[type.body, { color: theme.text, flex: 1 }]}>Time limit (minutes)</Text>
          <TextInput
            testID="builder-time-limit"
            value={set.exam?.timeLimitMinutes ? String(set.exam.timeLimitMinutes) : ''}
            onChangeText={(text) => {
              const n = Number.parseInt(text, 10);
              setSet({
                ...set,
                exam: { ...set.exam, timeLimitMinutes: Number.isFinite(n) ? n : undefined },
              });
            }}
            keyboardType="number-pad"
            style={inputStyle}
          />
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <Text style={[type.body, { color: theme.text, flex: 1 }]}>Shuffle questions</Text>
          <Switch
            testID="builder-shuffle-questions"
            value={set.exam?.shuffleQuestions ?? DEFAULT_EXAM.shuffleQuestions}
            onValueChange={(v) => setSet({ ...set, exam: { ...set.exam, shuffleQuestions: v } })}
          />
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <Text style={[type.body, { color: theme.text, flex: 1 }]}>Shuffle options</Text>
          <Switch
            testID="builder-shuffle-options"
            value={set.exam?.shuffleOptions ?? DEFAULT_EXAM.shuffleOptions}
            onValueChange={(v) => setSet({ ...set, exam: { ...set.exam, shuffleOptions: v } })}
          />
        </View>
      </Card>

      <View style={{ gap: spacing.sm }}>
        <Text style={[type.heading, { color: theme.text }]}>Questions</Text>
        {set.questions.map((question, index) =>
          editingIndex === index ? (
            <Card key={question.id} testID={`question-editor-${question.id}`}>
              {question.type === 'single' || question.type === 'multi' ? (
                <ChoiceQuestionEditor question={question} topics={topics} onChange={(q) => updateQuestion(index, q)} />
              ) : null}
              {question.type === 'boolean' ? (
                <BooleanQuestionEditor question={question} topics={topics} onChange={(q) => updateQuestion(index, q)} />
              ) : null}
              {question.type === 'ordering' ? (
                <OrderingQuestionEditor question={question} topics={topics} onChange={(q) => updateQuestion(index, q)} />
              ) : null}
              {question.type === 'matching' ? (
                <MatchingQuestionEditor question={question} topics={topics} onChange={(q) => updateQuestion(index, q)} />
              ) : null}
              <Button title="Done" onPress={() => setEditingIndex(null)} testID={`question-done-${question.id}`} />
            </Card>
          ) : (
            <Card key={question.id} testID={`question-card-${question.id}`}>
              <Text style={[type.body, { color: theme.text }]}>{question.prompt || '(no prompt yet)'}</Text>
              <Text style={[type.caption, { color: theme.textMuted }]}>{questionLabel(question)}</Text>
              <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                <Button
                  title="Edit"
                  variant="secondary"
                  onPress={() => setEditingIndex(index)}
                  testID={`question-edit-${question.id}`}
                />
                <Button
                  title="▲"
                  variant="secondary"
                  onPress={() => moveQuestion(index, -1)}
                  disabled={index === 0}
                  testID={`question-move-up-${question.id}`}
                />
                <Button
                  title="▼"
                  variant="secondary"
                  onPress={() => moveQuestion(index, 1)}
                  disabled={index === set.questions.length - 1}
                  testID={`question-move-down-${question.id}`}
                />
                <Button
                  title="Delete"
                  variant="danger"
                  onPress={() => removeQuestion(index)}
                  testID={`question-delete-${question.id}`}
                />
              </View>
            </Card>
          ),
        )}

        {!showTypePicker ? (
          <Button
            title="Add question"
            variant="secondary"
            onPress={() => setShowTypePicker(true)}
            testID="show-add-question"
          />
        ) : (
          <Card testID="add-question-picker">
            <Text style={[type.label, { color: theme.text }]}>Question type</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
              {QUESTION_TYPES.map(({ type: questionType, label }) => (
                <Button
                  key={questionType}
                  title={label}
                  variant="secondary"
                  onPress={() => addQuestion(questionType)}
                  testID={`add-question-${questionType}`}
                />
              ))}
            </View>
          </Card>
        )}
      </View>

      {errors && errors.length > 0 ? (
        <Card testID="builder-errors">
          <Text style={[type.heading, { color: theme.negative }]}>
            {`${errors.length} problem${errors.length === 1 ? '' : 's'} found`}
          </Text>
          <View style={{ gap: spacing.sm, marginTop: spacing.sm }}>
            {errors.map((error, index) => (
              <View key={`${error.location}-${index}`}>
                <Text style={[type.label, { color: theme.text }]}>{error.location}</Text>
                <Text style={[type.caption, { color: theme.textMuted }]}>{error.message}</Text>
              </View>
            ))}
          </View>
        </Card>
      ) : null}

      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        <Button
          title={saving ? 'Saving…' : 'Save'}
          onPress={() => onSave(initialSet ? set : { ...set, id: makeSetId(set.title || 'Untitled set') })}
          disabled={saving}
          testID="builder-save"
        />
        <Button title="Cancel" variant="secondary" onPress={onCancel} testID="builder-cancel" />
      </View>
    </Screen>
  );
}
