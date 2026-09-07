import { describe, expect, it } from '@jest/globals';
import { render, screen } from '@testing-library/react-native';
import type { Question } from '@/core/schema';
import { Feedback } from './Feedback';

const question: Question = {
  id: 'q-1',
  type: 'single',
  prompt: 'Which one?',
  explanation: 'Alpha is the first letter.',
  reference: { label: 'Read more', url: 'https://example.com' },
  options: [
    { id: 'a', text: 'Alpha', correct: true, explanation: 'Correct — it is first.' },
    { id: 'b', text: 'Beta', correct: false, explanation: 'Beta is second, not first.' },
  ],
};

describe('Feedback', () => {
  it('says the answer was correct', async () => {
    await render(<Feedback question={question} response={['a']} />);
    expect(screen.getByText('Correct')).toBeTruthy();
  });

  it('shows the chosen wrong explanation and the correct one, in that order', async () => {
    await render(<Feedback question={question} response={['b']} />);
    expect(screen.getByText('Incorrect')).toBeTruthy();
    expect(screen.getByText(/Beta is second/)).toBeTruthy();
    expect(screen.getByText(/Correct — it is first/)).toBeTruthy();
    expect(screen.getByText('Alpha is the first letter.')).toBeTruthy();
  });

  it('treats an unanswered question as incorrect', async () => {
    await render(<Feedback question={question} response={[]} />);
    expect(screen.getByText('Incorrect')).toBeTruthy();
  });

  it('renders the reference link when present', async () => {
    await render(<Feedback question={question} response={['a']} />);
    expect(screen.getByTestId('reference-link')).toBeTruthy();
  });

  it('renders only the question explanation for a boolean question', async () => {
    const boolQ: Question = {
      id: 'q-2',
      type: 'boolean',
      prompt: 'True?',
      answer: true,
      explanation: 'Because it is.',
    };
    await render(<Feedback question={boolQ} response={['false']} />);
    expect(screen.getByText('Because it is.')).toBeTruthy();
  });
});
