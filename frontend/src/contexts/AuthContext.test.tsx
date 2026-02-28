import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { AuthProvider, useAuth } from './AuthContext';

vi.mock('../services/api', () => ({
  authAPI: {
    getCurrentUser: vi.fn(),
  },
}));

vi.mock('../utils/auth', () => ({
  getToken: vi.fn(() => 'test-token'),
  redirectToLogin: vi.fn(),
}));

import { authAPI } from '../services/api';
import { redirectToLogin } from '../utils/auth';
const mockGetCurrentUser = vi.mocked(authAPI.getCurrentUser);
const mockRedirectToLogin = vi.mocked(redirectToLogin);

const TestConsumer = () => {
  const { user, loading, isAdmin, login, logout, register, setUserFromSSO } = useAuth();
  return (
    <div>
      <div data-testid="loading">{String(loading)}</div>
      <div data-testid="user">{user ? user.username : 'null'}</div>
      <div data-testid="admin">{String(isAdmin)}</div>
      <button onClick={login}>Login</button>
      <button onClick={logout}>Logout</button>
      <button onClick={register}>Register</button>
      <button onClick={() => setUserFromSSO({ id: 99, username: 'sso-user', email: '', first_name: '', last_name: '', role: 'USER', date_joined: '' })}>Set SSO</button>
    </div>
  );
};

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('should load user on mount', async () => {
    mockGetCurrentUser.mockResolvedValue({ data: { id: 1, username: 'admin', email: '', first_name: '', last_name: '', role: 'ADMIN', date_joined: '' } } as never);

    render(
      <AuthProvider><TestConsumer /></AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('user')).toHaveTextContent('admin');
    });
    expect(screen.getByTestId('admin')).toHaveTextContent('true');
  });

  it('should handle user load failure', async () => {
    mockGetCurrentUser.mockRejectedValue(new Error('fail'));

    render(
      <AuthProvider><TestConsumer /></AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false');
    });
    expect(screen.getByTestId('user')).toHaveTextContent('null');
  });

  it('should set loading to false when no token', async () => {
    const authUtils = await import('../utils/auth');
    vi.mocked(authUtils.getToken).mockReturnValue(null);

    render(
      <AuthProvider><TestConsumer /></AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false');
    });
  });

  it('useAuth should throw outside AuthProvider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<TestConsumer />)).toThrow('useAuth must be used within an AuthProvider');
    spy.mockRestore();
  });

  it('login should redirect to login page', async () => {
    mockGetCurrentUser.mockResolvedValue({ data: { id: 1, username: 'u', email: '', first_name: '', last_name: '', role: 'USER', date_joined: '' } } as never);

    render(<AuthProvider><TestConsumer /></AuthProvider>);
    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));

    fireEvent.click(screen.getByText('Login'));
    expect(mockRedirectToLogin).toHaveBeenCalled();
  });

  it('register should redirect to login page', async () => {
    mockGetCurrentUser.mockResolvedValue({ data: { id: 1, username: 'u', email: '', first_name: '', last_name: '', role: 'USER', date_joined: '' } } as never);

    render(<AuthProvider><TestConsumer /></AuthProvider>);
    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));

    fireEvent.click(screen.getByText('Register'));
    expect(mockRedirectToLogin).toHaveBeenCalled();
  });

  it('logout should clear user and redirect', async () => {
    mockGetCurrentUser.mockResolvedValue({ data: { id: 1, username: 'u', email: '', first_name: '', last_name: '', role: 'USER', date_joined: '' } } as never);

    render(<AuthProvider><TestConsumer /></AuthProvider>);
    await waitFor(() => expect(screen.getByTestId('user')).toHaveTextContent('u'));

    fireEvent.click(screen.getByText('Logout'));
    expect(screen.getByTestId('user')).toHaveTextContent('null');
    expect(mockRedirectToLogin).toHaveBeenCalled();
  });

  it('setUserFromSSO should set user', async () => {
    mockGetCurrentUser.mockResolvedValue({ data: { id: 1, username: 'u', email: '', first_name: '', last_name: '', role: 'USER', date_joined: '' } } as never);

    render(<AuthProvider><TestConsumer /></AuthProvider>);
    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));

    fireEvent.click(screen.getByText('Set SSO'));
    expect(screen.getByTestId('user')).toHaveTextContent('sso-user');
  });

  it('isAdmin should be false for non-admin user', async () => {
    mockGetCurrentUser.mockResolvedValue({ data: { id: 1, username: 'u', email: '', first_name: '', last_name: '', role: 'USER', date_joined: '' } } as never);

    render(<AuthProvider><TestConsumer /></AuthProvider>);
    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));
    expect(screen.getByTestId('admin')).toHaveTextContent('false');
  });
});
