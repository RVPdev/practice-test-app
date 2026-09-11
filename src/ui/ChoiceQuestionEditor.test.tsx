import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react-native';
import type { ChoiceQuestion, Topic } from '@/core/schema';
import { ChoiceQuestionEditor } from './ChoiceQuestionEditor';

const question: ChoiceQuestion = {
  id: 'q1',
  type: 'single',
  prompt: 'Pick one',
  options: [
    { id: 'o1', text: 'A', correct: true },
    { id: 'o2', text: 'B', correct: false },
  ],
};

const topics: Topic[] = [{ id: 'hardware', name: 'Hardware' }];

describe('ChoiceQuestionEditor', () => {
  it('reports a prompt edit', async () => {
    const onChange = jest.fn();
    await render(<ChoiceQuestionEditor question={question} topics={topics} onChange={onChange} />);
    await fireEvent.changeText(screen.getByTestId('choice-prompt'), 'Pick the best one');
    expect(onChange).toHaveBeenCalledWith({ ...question, prompt: 'Pick the best one' });
  });

  it('switches type to multi', async () => {
    const onChange = jest.fn();
    await render(<ChoiceQuestionEditor question={question} topics={topics} onChange={onChange} />);
    await fireEvent.press(screen.getByTestId('choice-type-multi'));
    expect(onChange).toHaveBeenCalledWith({ ...question, type: 'multi' });
  });

  it('adds a new option with the next sequential id', async () => {
    const onChange = jest.fn();
    await render(<ChoiceQuestionEditor question={question} topics={topics} onChange={onChange} />);
    await fireEvent.press(screen.getByTestId('add-option'));
    expect(onChange).toHaveBeenCalledWith({
      ...question,
      options: [...question.options, { id: 'o3', text: '', correct: false }],
    });
  });

  it('removes an option', async () => {
    const onChange = jest.fn();
    await render(<ChoiceQuestionEditor question={question} topics={topics} onChange={onChange} />);
    await fireEvent.press(screen.getByTestId('option-remove-o2'));
    expect(onChange).toHaveBeenCalledWith({ ...question, options: [question.options[0]] });
  });

  it('toggles an option correct', async () => {
    const onChange = jest.fn();
    await render(<ChoiceQuestionEditor question={question} topics={topics} onChange={onChange} />);
    await fireEvent(screen.getByTestId('option-correct-o2'), 'valueChange', true);
    expect(onChange).toHaveBeenCalledWith({
      ...question,
      options: [question.options[0], { ...question.options[1], correct: true }],
    });
  });

  it('selects and deselects a topic', async () => {
    const onChange = jest.fn();
    await render(<ChoiceQuestionEditor question={question} topics={topics} onChange={onChange} />);
    await fireEvent.press(screen.getByTestId('topic-chip-hardware'));
    expect(onChange).toHaveBeenCalledWith({ ...question, topicId: 'hardware' });
  });

  it('selects a difficulty', async () => {
    const onChange = jest.fn();
    await render(<ChoiceQuestionEditor question={question} topics={topics} onChange={onChange} />);
    await fireEvent.press(screen.getByTestId('difficulty-hard'));
    expect(onChange).toHaveBeenCalledWith({ ...question, difficulty: 'hard' });
  });

  it('reports an explanation edit', async () => {
    const onChange = jest.fn();
    await render(<ChoiceQuestionEditor question={question} topics={topics} onChange={onChange} />);
    await fireEvent.changeText(screen.getByTestId('question-explanation'), 'Because reasons');
    expect(onChange).toHaveBeenCalledWith({ ...question, explanation: 'Because reasons' });
  });
});
