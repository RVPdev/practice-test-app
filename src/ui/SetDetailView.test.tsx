import { act } from 'react';
import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { cleanup, fireEvent, render, screen } from '@testing-library/react-native';
import type { QuestionSet } from '@/core/schema';
import { SetDetailView } from './SetDetailView';

afterEach(() => {
  cleanup();
});

const set: QuestionSet = {
  schemaVersion: 1,
  id: 'set-1',
  title: 'Cloud Basics',
  description: 'A sample set',
  topics: [{ id: 'storage', name: 'Storage' }],
  exam: { questionCount: 2, timeLimitMinutes: 30, passingScore: 80 },
  questions: [
    { id: 'q-1', type: 'boolean', topicId: 'storage', prompt: 'True?', answer: true },
    { id: 'q-2', type: 'boolean', topicId: 'storage', prompt: 'Also true?', answer: true },
    { id: 'q-3', type: 'boolean', prompt: 'Still true?', answer: true },
  ],
};

describe('SetDetailView', () => {
  it('shows the title, description and topics', async () => {
    await render(<SetDetailView set={set} attempts={[]} onStart={() => {}} onOpenAttempt={() => {}} />);
    expect(screen.getByText('Cloud Basics')).toBeTruthy();
    expect(screen.getByText('A sample set')).toBeTruthy();
    expect(screen.getByText('Storage')).toBeTruthy();
  });

  it('prefills the mock configuration from the exam block', async () => {
    await render(<SetDetailView set={set} attempts={[]} onStart={() => {}} onOpenAttempt={() => {}} />);
    expect(screen.getByTestId('question-count-input').props.value).toBe('2');
    expect(screen.getByTestId('time-limit-input').props.value).toBe('30');
  });

  it('starts a mock run with the edited configuration', async () => {
    const onStart = jest.fn();
    await render(<SetDetailView set={set} attempts={[]} onStart={onStart} onOpenAttempt={() => {}} />);
    await act(async () => {
      fireEvent.changeText(screen.getByTestId('question-count-input'), '3');
    });
    fireEvent.press(screen.getByTestId('start-mock'));
    expect(onStart).toHaveBeenCalledWith('mock', expect.objectContaining({ questionCount: 3 }));
  });

  it('warns when the requested count exceeds the set size', async () => {
    await render(<SetDetailView set={set} attempts={[]} onStart={() => {}} onOpenAttempt={() => {}} />);
    await act(async () => {
      fireEvent.changeText(screen.getByTestId('question-count-input'), '65');
    });
    expect(screen.getByText(/only has 3 questions/)).toBeTruthy();
  });

  it('starts practice mode with no configuration', async () => {
    const onStart = jest.fn();
    await render(<SetDetailView set={set} attempts={[]} onStart={onStart} onOpenAttempt={() => {}} />);
    fireEvent.press(screen.getByTestId('start-practice'));
    expect(onStart).toHaveBeenCalledWith('practice', {});
  });

  it('hides the delete action for a set that cannot be deleted', async () => {
    await render(<SetDetailView set={set} attempts={[]} onStart={() => {}} onOpenAttempt={() => {}} />);
    expect(screen.queryByTestId('delete-set')).toBeNull();
  });

  it('hides edit and export actions for a set that cannot be deleted', async () => {
    await render(<SetDetailView set={set} attempts={[]} onStart={() => {}} onOpenAttempt={() => {}} />);
    expect(screen.queryByTestId('edit-set')).toBeNull();
    expect(screen.queryByTestId('export-set')).toBeNull();
  });

  it('shows and wires edit and export actions when provided', async () => {
    const onEdit = jest.fn();
    const onExport = jest.fn();
    await render(
      <SetDetailView
        set={set}
        attempts={[]}
        onStart={() => {}}
        onOpenAttempt={() => {}}
        onEdit={onEdit}
        onExport={onExport}
      />,
    );
    await fireEvent.press(screen.getByTestId('edit-set'));
    await fireEvent.press(screen.getByTestId('export-set'));
    expect(onEdit).toHaveBeenCalled();
    expect(onExport).toHaveBeenCalled();
  });
});
