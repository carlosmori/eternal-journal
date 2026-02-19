import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { WriteQuoteForm } from '../WriteQuoteForm';

jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  },
}));

describe('WriteQuoteForm', () => {
  it('renders title input, description textarea, and submit button', () => {
    render(<WriteQuoteForm mode="guest" />);

    expect(screen.getByPlaceholderText("What's on your mind?")).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Write from the heart...')).toBeInTheDocument();
    expect(screen.getByText('Save entry')).toBeInTheDocument();
  });

  it('shows validation message when submitting empty title', () => {
    render(<WriteQuoteForm mode="guest" />);

    fireEvent.click(screen.getByText('Save entry'));

    expect(screen.getByText('Give your thought a title.')).toBeInTheDocument();
  });

  it('calls onGuestAdd with trimmed data in guest mode', async () => {
    const onGuestAdd = jest.fn();
    render(<WriteQuoteForm mode="guest" onGuestAdd={onGuestAdd} />);

    fireEvent.change(screen.getByPlaceholderText("What's on your mind?"), { target: { value: '  My Title  ' } });
    fireEvent.change(screen.getByPlaceholderText('Write from the heart...'), { target: { value: '  My content  ' } });
    fireEvent.click(screen.getByText('Save entry'));

    await waitFor(() => {
      expect(onGuestAdd).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'My Title', description: 'My content' }),
      );
    });
  });
});
