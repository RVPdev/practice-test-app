import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react-native';
import type { Question } from '@/core/schema';
import { QuestionCard } from './QuestionCard';

const single: Question = {
  id: 'q-1',
  type: 'single',
  prompt: 'Which one?',
  options: [
    { id: 'a', text: 'Alpha', correct: true },
    { id: 'b', text: 'Beta', correct: false },
  ],
};

const multi: Question = { ...single, id: 'q-2', type: 'multi' } as Question;

const boolQ: Question = { id: 'q-3', type: 'boolean', prompt: 'Is it true?', answer: true };

const ordering: Question = {
  id: 'q-4',
  type: 'ordering',
  prompt: 'Order these',
  items: [
    { id: 'i1', text: 'One' },
    { id: 'i2', text: 'Two' },
  ],
  correctOrder: ['i1', 'i2'],
};

describe('QuestionCard', () => {
  it('renders the prompt', async () => {
    await render(
      <QuestionCard question={single} response={[]} revealed={false} optionOrder={['a', 'b']} onChange={() => {}} />,
    );
    expect(screen.getByText('Which one?')).toBeTruthy();
  });

  it('renders options in the given order', async () => {
    await render(
      <QuestionCard question={single} response={[]} revealed={false} optionOrder={['b', 'a']} onChange={() => {}} />,
    );
    const texts = screen.getAllByTestId(/^option-/).map((node) => node.props.testID);
    expect(texts).toEqual(['option-b', 'option-a']);
  });

  it('replaces the response for a single-choice question', async () => {
    const onChange = jest.fn();
    await render(
      <QuestionCard question={single} response={['a']} revealed={false} optionOrder={['a', 'b']} onChange={onChange} />,
    );
    await fireEvent.press(screen.getByTestId('option-b'));
    expect(onChange).toHaveBeenCalledWith(['b']);
  });

  it('toggles options for a multi-choice question', async () => {
    const onChange = jest.fn();
    await render(
      <QuestionCard question={multi} response={['a']} revealed={false} optionOrder={['a', 'b']} onChange={onChange} />,
    );
    await fireEvent.press(screen.getByTestId('option-b'));
    expect(onChange).toHaveBeenCalledWith(['a', 'b']);
    await fireEvent.press(screen.getByTestId('option-a'));
    expect(onChange).toHaveBeenCalledWith([]);
  });

  it('ignores taps once revealed', async () => {
    const onChange = jest.fn();
    await render(
      <QuestionCard question={single} response={['a']} revealed optionOrder={['a', 'b']} onChange={onChange} />,
    );
    await fireEvent.press(screen.getByTestId('option-b'));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('renders default True/False labels for a boolean question', async () => {
    await render(
      <QuestionCard question={boolQ} response={[]} revealed={false} optionOrder={[]} onChange={() => {}} />,
    );
    expect(screen.getByText('True')).toBeTruthy();
    expect(screen.getByText('False')).toBeTruthy();
  });

  it('uses custom boolean labels when the author supplies them', async () => {
    const labelled = { ...boolQ, labels: { true: 'Yes', false: 'No' } } as Question;
    await render(
      <QuestionCard question={labelled} response={[]} revealed={false} optionOrder={[]} onChange={() => {}} />,
    );
    expect(screen.getByText('Yes')).toBeTruthy();
  });

  it('answers a boolean question with the synthetic ids', async () => {
    const onChange = jest.fn();
    await render(
      <QuestionCard question={boolQ} response={[]} revealed={false} optionOrder={[]} onChange={onChange} />,
    );
    await fireEvent.press(screen.getByTestId('option-false'));
    expect(onChange).toHaveBeenCalledWith(['false']);
  });

  it('states plainly when a type has no renderer yet', async () => {
    await render(
      <QuestionCard question={ordering} response={[]} revealed={false} optionOrder={[]} onChange={() => {}} />,
    );
    expect(screen.getByTestId('unsupported-question')).toBeTruthy();
  });
});
