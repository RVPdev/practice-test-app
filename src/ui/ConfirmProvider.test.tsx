import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { Button } from 'react-native';
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react-native';
import { ConfirmProvider, useConfirm } from './ConfirmProvider';

afterEach(() => {
  cleanup();
});

function Harness({
  message,
  buttons,
}: {
  message?: string;
  buttons?: Parameters<ReturnType<typeof useConfirm>>[2];
}) {
  const confirm = useConfirm();
  return (
    <Button
      title="open"
      testID="open"
      onPress={() => confirm('Are you sure?', message, buttons)}
    />
  );
}

describe('ConfirmProvider / useConfirm', () => {
  it('shows title and message when confirm() is called', async () => {
    const view = await render(
      <ConfirmProvider>
        <Harness message="This cannot be undone." />
      </ConfirmProvider>,
    );

    fireEvent.press(view.getByTestId('open'));

    await waitFor(() => expect(view.getByTestId('confirm-dialog')).toBeTruthy());
    expect(view.getByText('Are you sure?')).toBeTruthy();
    expect(view.getByText('This cannot be undone.')).toBeTruthy();
  });

  it('renders one button per entry in buttons', async () => {
    const view = await render(
      <ConfirmProvider>
        <Harness
          buttons={[{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive' }]}
        />
      </ConfirmProvider>,
    );

    fireEvent.press(view.getByTestId('open'));

    await waitFor(() => expect(view.getByTestId('confirm-button-cancel')).toBeTruthy());
    expect(view.getByTestId('confirm-button-delete')).toBeTruthy();
  });

  it('defaults to a single "OK" button when buttons is omitted', async () => {
    const view = await render(
      <ConfirmProvider>
        <Harness />
      </ConfirmProvider>,
    );

    fireEvent.press(view.getByTestId('open'));

    await waitFor(() => expect(view.getByTestId('confirm-button-ok')).toBeTruthy());
  });

  it('pressing a button closes the dialog and invokes its onPress', async () => {
    const onPress = jest.fn<() => void>();
    const view = await render(
      <ConfirmProvider>
        <Harness buttons={[{ text: 'Confirm', onPress }]} />
      </ConfirmProvider>,
    );

    fireEvent.press(view.getByTestId('open'));
    await waitFor(() => expect(view.getByTestId('confirm-button-confirm')).toBeTruthy());

    fireEvent.press(view.getByTestId('confirm-button-confirm'));

    expect(onPress).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(view.queryByTestId('confirm-dialog')).toBeNull());
  });

  it('pressing a button with no onPress just closes the dialog without erroring', async () => {
    const view = await render(
      <ConfirmProvider>
        <Harness buttons={[{ text: 'Dismiss' }]} />
      </ConfirmProvider>,
    );

    fireEvent.press(view.getByTestId('open'));
    await waitFor(() => expect(view.getByTestId('confirm-button-dismiss')).toBeTruthy());

    fireEvent.press(view.getByTestId('confirm-button-dismiss'));

    await waitFor(() => expect(view.queryByTestId('confirm-dialog')).toBeNull());
  });
});
