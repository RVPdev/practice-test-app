import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react-native';
import type { OrderingQuestion, Topic } from '@/core/schema';
import { OrderingQuestionEditor } from './OrderingQuestionEditor';

const question: OrderingQuestion = {
  id: 'q1',
  type: 'ordering',
  prompt: 'Order these',
  items: [
    { id: 'i1', text: 'Plan' },
    { id: 'i2', text: 'Build' },
  ],
  correctOrder: ['i1', 'i2'],
};

const topics: Topic[] = [{ id: 'hardware', name: 'Hardware' }];

describe('OrderingQuestionEditor', () => {
  it('adds an item and derives correctOrder from the new item list', async () => {
    const onChange = jest.fn();
    await render(<OrderingQuestionEditor question={question} topics={topics} onChange={onChange} />);
    await fireEvent.press(screen.getByTestId('add-ordering-item'));
    expect(onChange).toHaveBeenCalledWith({
      ...question,
      items: [...question.items, { id: 'i3', text: '' }],
      correctOrder: ['i1', 'i2', 'i3'],
    });
  });

  it('moving an item down updates both items and correctOrder', async () => {
    const onChange = jest.fn();
    await render(<OrderingQuestionEditor question={question} topics={topics} onChange={onChange} />);
    await fireEvent.press(screen.getByTestId('ordering-move-down-i1'));
    expect(onChange).toHaveBeenCalledWith({
      ...question,
      items: [question.items[1], question.items[0]],
      correctOrder: ['i2', 'i1'],
    });
  });

  it('removing an item drops it from correctOrder too', async () => {
    const onChange = jest.fn();
    await render(<OrderingQuestionEditor question={question} topics={topics} onChange={onChange} />);
    await fireEvent.press(screen.getByTestId('ordering-remove-i2'));
    expect(onChange).toHaveBeenCalledWith({
      ...question,
      items: [question.items[0]],
      correctOrder: ['i1'],
    });
  });

  it('disables moving past either end', async () => {
    await render(<OrderingQuestionEditor question={question} topics={topics} onChange={() => {}} />);
    expect(screen.getByTestId('ordering-move-up-i1').props.accessibilityState.disabled).toBe(true);
    expect(screen.getByTestId('ordering-move-down-i2').props.accessibilityState.disabled).toBe(true);
  });

  it('selects a topic', async () => {
    const onChange = jest.fn();
    await render(<OrderingQuestionEditor question={question} topics={topics} onChange={onChange} />);
    await fireEvent.press(screen.getByTestId('topic-chip-hardware'));
    expect(onChange).toHaveBeenCalledWith({ ...question, topicId: 'hardware' });
  });

  it('selects a difficulty', async () => {
    const onChange = jest.fn();
    await render(<OrderingQuestionEditor question={question} topics={topics} onChange={onChange} />);
    await fireEvent.press(screen.getByTestId('difficulty-hard'));
    expect(onChange).toHaveBeenCalledWith({ ...question, difficulty: 'hard' });
  });

  it('reports an explanation edit', async () => {
    const onChange = jest.fn();
    await render(<OrderingQuestionEditor question={question} topics={topics} onChange={onChange} />);
    await fireEvent.changeText(screen.getByTestId('question-explanation'), 'Because reasons');
    expect(onChange).toHaveBeenCalledWith({ ...question, explanation: 'Because reasons' });
  });
});
