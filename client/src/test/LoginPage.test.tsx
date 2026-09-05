import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import { LoginPage } from '../pages/LoginPage';
import { ApiError } from '../api/client';

const meMock = vi.fn(async (..._args: unknown[]) => {
  throw new ApiError(401, 'Authentication required');
});
const loginMock = vi.fn((..._args: unknown[]) => Promise.reject(new Error('not stubbed')));

vi.mock('../api/auth', () => ({
  authApi: {
    me: (...args: unknown[]) => meMock(...args),
    login: (...args: unknown[]) => loginMock(...args),
    register: vi.fn(),
    logout: vi.fn(),
  },
}));

function renderLogin() {
  return render(
    <MemoryRouter initialEntries={['/login']}>
      <AuthProvider>
        <LoginPage />
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe('LoginPage', () => {
  it('shows a human-readable error message on invalid credentials', async () => {
    loginMock.mockRejectedValueOnce(new ApiError(401, 'Invalid email or password'));
    const user = userEvent.setup();
    renderLogin();

    await user.type(screen.getByLabelText('Email'), 'wrong@example.com');
    await user.type(screen.getByLabelText('Password'), 'wrongpassword');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByText('Invalid email or password')).toBeInTheDocument();
  });
});
