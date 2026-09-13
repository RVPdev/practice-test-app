import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { act } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react-native';
import { WelcomeView } from './WelcomeView';

afterEach(() => {
  cleanup();
});

describe('WelcomeView', () => {
  it('disables "Get Started" until the consent toggle is switched on', async () => {
    const onAccept = jest.fn();
    await render(<WelcomeView onAccept={onAccept} />);

    expect(screen.getByTestId('consent-continue').props.accessibilityState.disabled).toBe(true);

    await act(async () => {
      fireEvent(screen.getByTestId('consent-toggle'), 'valueChange', true);
    });

    expect(screen.getByTestId('consent-continue').props.accessibilityState.disabled).toBe(false);
    await fireEvent.press(screen.getByTestId('consent-continue'));
    expect(onAccept).toHaveBeenCalledTimes(1);
  });

  it('does not call onAccept when "Get Started" is pressed while disabled', async () => {
    const onAccept = jest.fn();
    await render(<WelcomeView onAccept={onAccept} />);

    await fireEvent.press(screen.getByTestId('consent-continue'));

    expect(onAccept).not.toHaveBeenCalled();
  });

  it('opens and closes the Privacy Policy document', async () => {
    await render(<WelcomeView onAccept={() => {}} />);
    expect(screen.queryByText('Privacy Policy')).toBeNull();

    await fireEvent.press(screen.getByTestId('view-privacy'));
    expect(screen.getByText('Privacy Policy')).toBeTruthy();

    await fireEvent.press(screen.getByTestId('close-privacy'));
    expect(screen.queryByText('Privacy Policy')).toBeNull();
  });

  it('opens and closes the Terms of Service document', async () => {
    await render(<WelcomeView onAccept={() => {}} />);
    expect(screen.queryByText('Terms of Service')).toBeNull();

    await fireEvent.press(screen.getByTestId('view-terms'));
    expect(screen.getByText('Terms of Service')).toBeTruthy();

    await fireEvent.press(screen.getByTestId('close-terms'));
    expect(screen.queryByText('Terms of Service')).toBeNull();
  });
});
