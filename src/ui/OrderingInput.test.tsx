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
