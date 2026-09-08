import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react-native';
import type { OrderingQuestion } from '@/core/schema';
import { OrderingInput } from './OrderingInput';

const question: OrderingQuestion = {
  id: 'q-ord',
  type: 'ordering',
  prompt: 'Order these',
  items: [
    { id: 'i1', text: 'Plan' },
    { id: 'i2', text: 'Build' },
    { id: 'i3', text: 'Ship' },
  ],
  correctOrder: ['i1', 'i2', 'i3'],
};

describe('OrderingInput', () => {
  it('starts from the presented order when there is no response yet', async () => {
    await render(
      <OrderingInput
        question={question}
        response={[]}
        revealed={false}
        initialOrder={['i3', 'i1', 'i2']}
        onChange={() => {}}
      />,
    );
    const rows = screen.getAllByTestId(/^order-row-/).map((n) => n.props.testID);
    expect(rows).toEqual(['order-row-i3', 'order-row-i1', 'order-row-i2']);
  });

  it('renders the response order once the user has moved something', async () => {
    await render(
      <OrderingInput
        question={question}
        response={['i2', 'i1', 'i3']}
        revealed={false}
        initialOrder={['i3', 'i1', 'i2']}
        onChange={() => {}}
      />,
    );
    const rows = screen.getAllByTestId(/^order-row-/).map((n) => n.props.testID);
    expect(rows).toEqual(['order-row-i2', 'order-row-i1', 'order-row-i3']);
  });

  it('moves an item down', async () => {
    const onChange = jest.fn();
    await render(
      <OrderingInput
        question={question}
        response={['i1', 'i2', 'i3']}
        revealed={false}
        initialOrder={['i1', 'i2', 'i3']}
        onChange={onChange}
      />,
    );
    await fireEvent.press(screen.getByTestId('move-down-i1'));
    expect(onChange).toHaveBeenCalledWith(['i2', 'i1', 'i3']);
  });

  it('moves an item up', async () => {
    const onChange = jest.fn();
    await render(
      <OrderingInput
        question={question}
        response={['i1', 'i2', 'i3']}
        revealed={false}
        initialOrder={['i1', 'i2', 'i3']}
        onChange={onChange}
      />,
    );
    await fireEvent.press(screen.getByTestId('move-up-i3'));
    expect(onChange).toHaveBeenCalledWith(['i1', 'i3', 'i2']);
  });

  it('disables moving past either end', async () => {
    await render(
      <OrderingInput
        question={question}
        response={['i1', 'i2', 'i3']}
        revealed={false}
        initialOrder={['i1', 'i2', 'i3']}
        onChange={() => {}}
      />,
    );
    expect(screen.getByTestId('move-up-i1').props.accessibilityState.disabled).toBe(true);
    expect(screen.getByTestId('move-down-i3').props.accessibilityState.disabled).toBe(true);
  });

  it('reports the presented order as the answer before the user touches anything', async () => {
    // Agreeing with the shown order is a real answer, so it must be submittable as-is.
    const onChange = jest.fn();
    await render(
      <OrderingInput
        question={question}
        response={[]}
        revealed={false}
        initialOrder={['i3', 'i1', 'i2']}
        onChange={onChange}
      />,
    );
    expect(onChange).toHaveBeenCalledWith(['i3', 'i1', 'i2']);
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('does not overwrite an answer that is already there', async () => {
    const onChange = jest.fn();
    await render(
      <OrderingInput
        question={question}
        response={['i2', 'i1', 'i3']}
        revealed={false}
        initialOrder={['i3', 'i1', 'i2']}
        onChange={onChange}
      />,
    );
    expect(onChange).not.toHaveBeenCalled();
  });

  it('reports nothing once the question is revealed', async () => {
    const onChange = jest.fn();
    await render(
      <OrderingInput
        question={question}
        response={[]}
        revealed
        initialOrder={['i3', 'i1', 'i2']}
        onChange={onChange}
      />,
    );
    expect(onChange).not.toHaveBeenCalled();
  });

  it('reports the presented order again when it is shown a different question', async () => {
    const onChange = jest.fn();
    const view = await render(
      <OrderingInput
        question={question}
        response={[]}
        revealed={false}
        initialOrder={['i3', 'i1', 'i2']}
        onChange={onChange}
      />,
    );
    // The runner reuses this instance across questions, so the seeding is per question id.
    const next = { ...question, id: 'q-ord-2' };
    await view.rerender(
      <OrderingInput
        question={next}
        response={[]}
        revealed={false}
        initialOrder={['i2', 'i3', 'i1']}
        onChange={onChange}
      />,
    );
    expect(onChange).toHaveBeenNthCalledWith(1, ['i3', 'i1', 'i2']);
    expect(onChange).toHaveBeenNthCalledWith(2, ['i2', 'i3', 'i1']);
  });

  it('grades no row when a revealed question was never answered', async () => {
    await render(
      <OrderingInput
        question={question}
        response={[]}
        revealed
        initialOrder={['i1', 'i2', 'i3']}
        onChange={() => {}}
      />,
    );
    const labels = screen
      .getAllByTestId(/^order-row-/)
      .map((node) => node.props.accessibilityLabel as string);
    expect(labels.some((label) => label.includes('correct position'))).toBe(false);
    expect(labels.some((label) => label.includes('wrong position'))).toBe(false);
    expect(labels.every((label) => label.includes('not answered'))).toBe(true);
  });

  it('locks the controls and marks correct positions once revealed', async () => {
    const onChange = jest.fn();
    await render(
      <OrderingInput
        question={question}
        response={['i2', 'i1', 'i3']}
        revealed
        initialOrder={['i1', 'i2', 'i3']}
        onChange={onChange}
      />,
    );
    await fireEvent.press(screen.getByTestId('move-down-i2'));
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByTestId('order-row-i3').props.accessibilityLabel).toContain('correct position');
  });
});
