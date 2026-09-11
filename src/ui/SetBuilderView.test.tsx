// src/ui/SetBuilderView.test.tsx
import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react-native';
import type { QuestionSet } from '@/core/schema';
import { SetBuilderView } from './SetBuilderView';

describe('SetBuilderView', () => {
  it('starts with an empty title when creating a new set', async () => {
    await render(
      <SetBuilderView initialSet={null} errors={null} saving={false} onSave={() => {}} onCancel={() => {}} />,
    );
    expect(screen.getByTestId('builder-title').props.value).toBe('');
  });

  it('pre-fills the form when editing an existing set', async () => {
    const existing: QuestionSet = {
      schemaVersion: 1,
      id: 'existing-set',
      title: 'Existing Set',
      questions: [{ id: 'q1', type: 'boolean', prompt: 'True?', answer: true }],
    };
    await render(
      <SetBuilderView initialSet={existing} errors={null} saving={false} onSave={() => {}} onCancel={() => {}} />,
    );
    expect(screen.getByTestId('builder-title').props.value).toBe('Existing Set');
    expect(screen.getByTestId('question-card-q1')).toBeTruthy();
  });

  it('adds a topic', async () => {
    await render(
      <SetBuilderView initialSet={null} errors={null} saving={false} onSave={() => {}} onCancel={() => {}} />,
    );
    await fireEvent.changeText(screen.getByTestId('new-topic-name'), 'Networking');
    await fireEvent.press(screen.getByTestId('add-topic'));
    expect(screen.getByTestId('topic-row-networking')).toBeTruthy();
  });

  it('adds a boolean question and opens its editor', async () => {
    await render(
      <SetBuilderView initialSet={null} errors={null} saving={false} onSave={() => {}} onCancel={() => {}} />,
    );
    await fireEvent.press(screen.getByTestId('show-add-question'));
    await fireEvent.press(screen.getByTestId('add-question-boolean'));
    expect(screen.getByTestId('question-editor-q1')).toBeTruthy();
    expect(screen.getByTestId('boolean-prompt')).toBeTruthy();
  });

  it('collapses a question back to a card when Done is pressed', async () => {
    await render(
      <SetBuilderView initialSet={null} errors={null} saving={false} onSave={() => {}} onCancel={() => {}} />,
    );
    await fireEvent.press(screen.getByTestId('show-add-question'));
    await fireEvent.press(screen.getByTestId('add-question-boolean'));
    await fireEvent.press(screen.getByTestId('question-done-q1'));
    expect(screen.getByTestId('question-card-q1')).toBeTruthy();
  });

  it('deletes a question', async () => {
    await render(
      <SetBuilderView initialSet={null} errors={null} saving={false} onSave={() => {}} onCancel={() => {}} />,
    );
    await fireEvent.press(screen.getByTestId('show-add-question'));
    await fireEvent.press(screen.getByTestId('add-question-boolean'));
    await fireEvent.press(screen.getByTestId('question-done-q1'));
    await fireEvent.press(screen.getByTestId('question-delete-q1'));
    expect(screen.queryByTestId('question-card-q1')).toBeNull();
  });

  it('reorders two questions', async () => {
    await render(
      <SetBuilderView initialSet={null} errors={null} saving={false} onSave={() => {}} onCancel={() => {}} />,
    );
    await fireEvent.press(screen.getByTestId('show-add-question'));
    await fireEvent.press(screen.getByTestId('add-question-boolean'));
    await fireEvent.press(screen.getByTestId('question-done-q1'));
    await fireEvent.press(screen.getByTestId('show-add-question'));
    await fireEvent.press(screen.getByTestId('add-question-boolean'));
    await fireEvent.press(screen.getByTestId('question-done-q2'));
    await fireEvent.press(screen.getByTestId('question-move-up-q2'));
    const cards = screen.getAllByTestId(/^question-card-/).map((n) => n.props.testID);
    expect(cards).toEqual(['question-card-q2', 'question-card-q1']);
  });

  it('shows validation errors when passed', async () => {
    await render(
      <SetBuilderView
        initialSet={null}
        errors={[{ location: 'title', message: 'is required' }]}
        saving={false}
        onSave={() => {}}
        onCancel={() => {}}
      />,
    );
    expect(screen.getByTestId('builder-errors')).toBeTruthy();
  });

  it('calls onSave with the assembled set', async () => {
    const onSave = jest.fn<(set: QuestionSet) => void>();
    await render(
      <SetBuilderView initialSet={null} errors={null} saving={false} onSave={onSave} onCancel={() => {}} />,
    );
    await fireEvent.changeText(screen.getByTestId('builder-title'), 'My Set');
    await fireEvent.press(screen.getByTestId('builder-save'));
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave.mock.calls[0][0].title).toBe('My Set');
  });

  it('derives the id from the entered title for a new set, not "untitled-set"', async () => {
    const onSave = jest.fn<(set: QuestionSet) => void>();
    await render(
      <SetBuilderView initialSet={null} errors={null} saving={false} onSave={onSave} onCancel={() => {}} />,
    );
    await fireEvent.changeText(screen.getByTestId('builder-title'), 'My Great Set');
    await fireEvent.press(screen.getByTestId('builder-save'));
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave.mock.calls[0][0].id).toMatch(/^my-great-set-[a-z0-9]{6}$/);
  });

  it('keeps the existing id unchanged when saving an edited set', async () => {
    const onSave = jest.fn<(set: QuestionSet) => void>();
    const existing: QuestionSet = {
      schemaVersion: 1,
      id: 'existing-set',
      title: 'Existing Set',
      questions: [{ id: 'q1', type: 'boolean', prompt: 'True?', answer: true }],
    };
    await render(
      <SetBuilderView initialSet={existing} errors={null} saving={false} onSave={onSave} onCancel={() => {}} />,
    );
    await fireEvent.changeText(screen.getByTestId('builder-title'), 'Renamed Set');
    await fireEvent.press(screen.getByTestId('builder-save'));
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave.mock.calls[0][0].id).toBe('existing-set');
  });

  it('calls onCancel', async () => {
    const onCancel = jest.fn();
    await render(
      <SetBuilderView initialSet={null} errors={null} saving={false} onSave={() => {}} onCancel={onCancel} />,
    );
    await fireEvent.press(screen.getByTestId('builder-cancel'));
    expect(onCancel).toHaveBeenCalled();
  });
});
