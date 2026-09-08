import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { ImportView } from './ImportView';

describe('ImportView', () => {
  it('offers a file picker', async () => {
    const onPick = jest.fn();
    await render(<ImportView busy={false} errors={null} importedTitle={null} onPick={onPick} onDone={() => {}} />);
    await fireEvent.press(screen.getByTestId('pick-file'));
    expect(onPick).toHaveBeenCalled();
  });

  it('disables the picker while a file is being read', async () => {
    await render(<ImportView busy errors={null} importedTitle={null} onPick={() => {}} onDone={() => {}} />);
    expect(screen.getByTestId('pick-file').props.accessibilityState.disabled).toBe(true);
  });

  it('lists every problem with its location and a count', async () => {
    await render(
      <ImportView
        busy={false}
        errors={[
          { location: 'Question 12 ("q-012")', message: 'no option is marked "correct"' },
          { location: 'Question 31 ("q-031")', message: 'topicId "vpc " is not declared in topics' },
        ]}
        importedTitle={null}
        onPick={() => {}}
        onDone={() => {}}
      />,
    );
    expect(screen.getByText('2 problems found')).toBeTruthy();
    expect(screen.getByText('Question 12 ("q-012")')).toBeTruthy();
    expect(screen.getByText('no option is marked "correct"')).toBeTruthy();
  });

  it('says nothing was imported when validation failed', async () => {
    await render(
      <ImportView
        busy={false}
        errors={[{ location: 'File', message: 'the file is not valid JSON' }]}
        importedTitle={null}
        onPick={() => {}}
        onDone={() => {}}
      />,
    );
    expect(screen.getByText(/Nothing was imported/)).toBeTruthy();
  });

  it('confirms a successful import by name', async () => {
    const onDone = jest.fn();
    await render(
      <ImportView busy={false} errors={null} importedTitle="Cloud Basics" onPick={() => {}} onDone={onDone} />,
    );
    expect(screen.getByText(/Imported "Cloud Basics"/)).toBeTruthy();
    await fireEvent.press(screen.getByTestId('import-done'));
    expect(onDone).toHaveBeenCalled();
  });
});
