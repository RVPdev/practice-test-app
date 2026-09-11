// src/ui/MatchingQuestionEditor.test.tsx
import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react-native';
import type { MatchingQuestion, Topic } from '@/core/schema';
import { MatchingQuestionEditor } from './MatchingQuestionEditor';

const question: MatchingQuestion = {
  id: 'q1',
  type: 'matching',
  prompt: 'Match these',
  left: [
    { id: 'l1', text: 'Cat' },
    { id: 'l2', text: 'Dog' },
  ],
  right: [
    { id: 'r1', text: 'Meow' },
    { id: 'r2', text: 'Woof' },
  ],
  pairs: [{ left: 'l1', right: 'r1' }],
};

const topics: Topic[] = [{ id: 'hardware', name: 'Hardware' }];

describe('MatchingQuestionEditor', () => {
  it('adds a left item with the next sequential id', async () => {
    const onChange = jest.fn();
    await render(<MatchingQuestionEditor question={question} topics={topics} onChange={onChange} />);
    await fireEvent.press(screen.getByTestId('add-left'));
    expect(onChange).toHaveBeenCalledWith({
      ...question,
      left: [...question.left, { id: 'l3', text: '' }],
    });
  });

  it('builds a new pair by tapping a left chip then a right chip', async () => {
    const onChange = jest.fn();
    await render(<MatchingQuestionEditor question={question} topics={topics} onChange={onChange} />);
    await fireEvent.press(screen.getByTestId('pair-left-chip-l2'));
    await fireEvent.press(screen.getByTestId('pair-right-chip-r2'));
    expect(onChange).toHaveBeenCalledWith({
      ...question,
      pairs: [...question.pairs, { left: 'l2', right: 'r2' }],
    });
  });

  it('replaces an existing pair for the same left item', async () => {
    const onChange = jest.fn();
    await render(<MatchingQuestionEditor question={question} topics={topics} onChange={onChange} />);
    await fireEvent.press(screen.getByTestId('pair-left-chip-l1'));
    await fireEvent.press(screen.getByTestId('pair-right-chip-r2'));
    expect(onChange).toHaveBeenCalledWith({ ...question, pairs: [{ left: 'l1', right: 'r2' }] });
  });

  it('removing a left item also drops any pair that used it', async () => {
    const onChange = jest.fn();
    await render(<MatchingQuestionEditor question={question} topics={topics} onChange={onChange} />);
    await fireEvent.press(screen.getByTestId('left-remove-l1'));
    expect(onChange).toHaveBeenCalledWith({
      ...question,
      left: [question.left[1]],
      pairs: [],
    });
  });

  it('removing a pair keeps the left and right items', async () => {
    const onChange = jest.fn();
    await render(<MatchingQuestionEditor question={question} topics={topics} onChange={onChange} />);
    await fireEvent.press(screen.getByTestId('pair-remove-l1'));
    expect(onChange).toHaveBeenCalledWith({ ...question, pairs: [] });
  });

  it('selects a topic', async () => {
    const onChange = jest.fn();
    await render(<MatchingQuestionEditor question={question} topics={topics} onChange={onChange} />);
    await fireEvent.press(screen.getByTestId('topic-chip-hardware'));
    expect(onChange).toHaveBeenCalledWith({ ...question, topicId: 'hardware' });
  });

  it('selects a difficulty', async () => {
    const onChange = jest.fn();
    await render(<MatchingQuestionEditor question={question} topics={topics} onChange={onChange} />);
    await fireEvent.press(screen.getByTestId('difficulty-medium'));
    expect(onChange).toHaveBeenCalledWith({ ...question, difficulty: 'medium' });
  });

  it('reports an explanation edit', async () => {
    const onChange = jest.fn();
    await render(<MatchingQuestionEditor question={question} topics={topics} onChange={onChange} />);
    await fireEvent.changeText(screen.getByTestId('question-explanation'), 'Because reasons');
    expect(onChange).toHaveBeenCalledWith({ ...question, explanation: 'Because reasons' });
  });
});
