// src/ui/LibraryView.test.tsx
import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen, within } from '@testing-library/react-native';
import type { SetSummary } from '@/data/repository';
import { LibraryView } from './LibraryView';

const summary = (over: Partial<SetSummary> = {}): SetSummary => ({
  id: 'set-1',
  title: 'Cloud Basics',
  description: 'A sample set',
  version: '1.0.0',
  questionCount: 40,
  topicCount: 3,
  source: 'bundled',
  attemptCount: 0,
  bestPercent: null,
  lastAttemptAt: null,
  ...over,
});

describe('LibraryView', () => {
  it('lists each set with its question and topic counts', async () => {
    await render(
      <LibraryView
        sets={[summary()]}
        loading={false}
        onOpenSet={() => {}}
        onImport={() => {}}
        onCreate={() => {}}
      />,
    );
    expect(screen.getByText('Cloud Basics')).toBeTruthy();
    expect(screen.getByText('40 questions · 3 topics')).toBeTruthy();
  });

  it('shows the best score and last attempt when there is history', async () => {
    await render(
      <LibraryView
        sets={[summary({ attemptCount: 2, bestPercent: 82.5, lastAttemptAt: '2026-09-06T14:00:00.000Z' })]}
        loading={false}
        onOpenSet={() => {}}
        onImport={() => {}}
        onCreate={() => {}}
      />,
    );
    expect(screen.getByText(/Best 82.5%/)).toBeTruthy();
  });

  it('opens a set when its card is tapped', async () => {
    const onOpenSet = jest.fn();
    await render(
      <LibraryView
        sets={[summary()]}
        loading={false}
        onOpenSet={onOpenSet}
        onImport={() => {}}
        onCreate={() => {}}
      />,
    );
    fireEvent.press(screen.getByTestId('set-card-set-1'));
    expect(onOpenSet).toHaveBeenCalledWith('set-1');
  });

  it('shows an empty state pointing at import when there are no sets', async () => {
    const onImport = jest.fn();
    await render(
      <LibraryView sets={[]} loading={false} onOpenSet={() => {}} onImport={onImport} onCreate={() => {}} />,
    );
    expect(screen.getByText(/No question sets yet/)).toBeTruthy();
    fireEvent.press(screen.getByTestId('import-button'));
    expect(onImport).toHaveBeenCalled();
  });

  it('opens the builder when "Create a set" is tapped', async () => {
    const onCreate = jest.fn();
    await render(
      <LibraryView sets={[]} loading={false} onOpenSet={() => {}} onImport={() => {}} onCreate={onCreate} />,
    );
    await fireEvent.press(screen.getByTestId('create-button'));
    expect(onCreate).toHaveBeenCalled();
  });

  it('shows a loading state instead of the empty state while loading', async () => {
    await render(<LibraryView sets={[]} loading onOpenSet={() => {}} onImport={() => {}} onCreate={() => {}} />);
    expect(screen.queryByText(/No question sets yet/)).toBeNull();
    expect(screen.getByTestId('library-loading')).toBeTruthy();
  });
});

describe('LibraryView resume banner', () => {
  const inProgress = { attemptId: 'att_1', setTitle: 'Cloud Basics', mode: 'mock' as const };

  const base = {
    sets: [summary()],
    loading: false,
    onOpenSet: () => {},
    onImport: () => {},
    onCreate: () => {},
  };

  it('shows nothing when there is no in-progress session', async () => {
    await render(<LibraryView {...base} inProgress={null} onResume={() => {}} onDiscard={() => {}} />);
    expect(screen.queryByTestId('resume-banner')).toBeNull();
  });

  it('offers to resume an interrupted attempt by set name', async () => {
    const onResume = jest.fn();
    await render(
      <LibraryView {...base} inProgress={inProgress} onResume={onResume} onDiscard={() => {}} />,
    );
    expect(within(screen.getByTestId('resume-banner')).getByText(/Cloud Basics/)).toBeTruthy();
    await fireEvent.press(screen.getByTestId('resume-session'));
    expect(onResume).toHaveBeenCalled();
  });

  it('offers to discard it', async () => {
    const onDiscard = jest.fn();
    await render(
      <LibraryView {...base} inProgress={inProgress} onResume={() => {}} onDiscard={onDiscard} />,
    );
    await fireEvent.press(screen.getByTestId('discard-session'));
    expect(onDiscard).toHaveBeenCalled();
  });
});
