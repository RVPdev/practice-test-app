import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react-native';
import type { SetSummary } from '@/data/repository';
import { HiddenSetsView } from './HiddenSetsView';

const summary = (over: Partial<SetSummary> = {}): SetSummary => ({
  id: 'set-1',
  title: 'Security+',
  description: null,
  version: null,
  questionCount: 90,
  topicCount: 5,
  source: 'bundled',
  attemptCount: 0,
  bestPercent: null,
  lastAttemptAt: null,
  ...over,
});

describe('HiddenSetsView', () => {
  it('shows a loading indicator while loading', async () => {
    await render(<HiddenSetsView sets={[]} loading onRestore={() => {}} />);
    expect(screen.getByTestId('hidden-sets-loading')).toBeTruthy();
  });

  it('shows an empty state when there are no hidden sets', async () => {
    await render(<HiddenSetsView sets={[]} loading={false} onRestore={() => {}} />);
    expect(screen.getByText('No hidden exams.')).toBeTruthy();
  });

  it('lists each hidden set with a Restore button that calls onRestore with its id', async () => {
    const onRestore = jest.fn();
    await render(<HiddenSetsView sets={[summary()]} loading={false} onRestore={onRestore} />);
    expect(screen.getByText('Security+')).toBeTruthy();
    expect(screen.getByText('90 questions')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('restore-set-set-1'));
    expect(onRestore).toHaveBeenCalledWith('set-1');
  });
});
