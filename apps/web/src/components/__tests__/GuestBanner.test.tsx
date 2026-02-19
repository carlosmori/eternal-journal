import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { GuestBanner } from '../GuestBanner';

jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}));

describe('GuestBanner', () => {
  it('renders guest mode warning and description', () => {
    render(<GuestBanner />);

    expect(screen.getByText('Guest mode')).toBeInTheDocument();
    expect(screen.getByText(/saved only on this device/i)).toBeInTheDocument();
  });

  it('renders sign-in button when callback provided', () => {
    const onOpenSignIn = jest.fn();
    render(<GuestBanner onOpenSignIn={onOpenSignIn} />);

    const btn = screen.getByText('Sign in');
    expect(btn).toBeInTheDocument();

    fireEvent.click(btn);
    expect(onOpenSignIn).toHaveBeenCalledTimes(1);
  });

  it('does not render sign-in button when no callback', () => {
    render(<GuestBanner />);
    expect(screen.queryByText('Sign in')).not.toBeInTheDocument();
  });
});
