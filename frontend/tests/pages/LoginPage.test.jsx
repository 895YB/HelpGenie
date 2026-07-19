import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const loginMock = vi.fn();

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ login: loginMock }),
}));

const { default: LoginPage } = await import('@/pages/auth/LoginPage.jsx');

function renderPage() {
  return render(
    <MemoryRouter>
      <LoginPage />
    </MemoryRouter>
  );
}

describe('LoginPage', () => {
  beforeEach(() => {
    loginMock.mockReset();
  });

  it('shows validation errors and does not call login when submitted empty', async () => {
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    expect(await screen.findByText('Email is required')).toBeInTheDocument();
    expect(screen.getByText('Password is required')).toBeInTheDocument();
    expect(loginMock).not.toHaveBeenCalled();
  });

  it('submits the entered credentials to login()', async () => {
    loginMock.mockResolvedValue({});
    renderPage();

    fireEvent.change(screen.getByLabelText('Email address'), { target: { value: 'user@acme.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'secret123' } });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() =>
      expect(loginMock).toHaveBeenCalledWith({ email: 'user@acme.com', password: 'secret123' })
    );
  });

  it('shows the server error message when login rejects', async () => {
    loginMock.mockRejectedValue(new Error('Invalid email or password'));
    renderPage();

    fireEvent.change(screen.getByLabelText('Email address'), { target: { value: 'user@acme.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'wrongpass' } });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid email or password');
  });
});
