import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react-native';
import type { BooleanQuestion, Topic } from '@/core/schema';
import { BooleanQuestionEditor } from './BooleanQuestionEditor';

const question: BooleanQuestion = {
  id: 'q1',
  type: 'boolean',
  prompt: 'Is the sky blue?',
  answer: true,
};

const topics: Topic[] = [{ id: 'hardware', name: 'Hardware' }];

describe('BooleanQuestionEditor', () => {
  it('reports a prompt edit', async () => {
    const onChange = jest.fn();
    await render(<BooleanQuestionEditor question={question} topics={topics} onChange={onChange} />);
    await fireEvent.changeText(screen.getByTestId('boolean-prompt'), 'Is grass green?');
    expect(onChange).toHaveBeenCalledWith({ ...question, prompt: 'Is grass green?' });
  });

  it('switches the answer to false', async () => {
    const onChange = jest.fn();
    await render(<BooleanQuestionEditor question={question} topics={topics} onChange={onChange} />);
    await fireEvent.press(screen.getByTestId('boolean-answer-false'));
    expect(onChange).toHaveBeenCalledWith({ ...question, answer: false });
  });

  it('does not set labels until both true and false text are present', async () => {
    const onChange = jest.fn();
    await render(<BooleanQuestionEditor question={question} topics={topics} onChange={onChange} />);
    await fireEvent.changeText(screen.getByTestId('boolean-label-true'), 'Yes');
    expect(onChange).toHaveBeenCalledWith({ ...question, labels: undefined });
  });

  it('sets labels once both true and false text are present', async () => {
    const onChange = jest.fn();
    const withTrueLabel = { ...question, labels: { true: 'Yes', false: '' } };
    await render(<BooleanQuestionEditor question={withTrueLabel} topics={topics} onChange={onChange} />);
    await fireEvent.changeText(screen.getByTestId('boolean-label-false'), 'No');
    expect(onChange).toHaveBeenCalledWith({
      ...withTrueLabel,
      labels: { true: 'Yes', false: 'No' },
    });
  });

  it('selects a topic', async () => {
    const onChange = jest.fn();
    await render(<BooleanQuestionEditor question={question} topics={topics} onChange={onChange} />);
    await fireEvent.press(screen.getByTestId('topic-chip-hardware'));
    expect(onChange).toHaveBeenCalledWith({ ...question, topicId: 'hardware' });
  });

  it('selects a difficulty', async () => {
    const onChange = jest.fn();
    await render(<BooleanQuestionEditor question={question} topics={topics} onChange={onChange} />);
    await fireEvent.press(screen.getByTestId('difficulty-easy'));
    expect(onChange).toHaveBeenCalledWith({ ...question, difficulty: 'easy' });
  });

  it('reports an explanation edit', async () => {
    const onChange = jest.fn();
    await render(<BooleanQuestionEditor question={question} topics={topics} onChange={onChange} />);
    await fireEvent.changeText(screen.getByTestId('question-explanation'), 'Because reasons');
    expect(onChange).toHaveBeenCalledWith({ ...question, explanation: 'Because reasons' });
  });
});
