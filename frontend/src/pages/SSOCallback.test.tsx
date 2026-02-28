import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import SSOCallback from './SSOCallback';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useSearchParams: () => [new URLSearchParams(window.location.search)],
  };
});

const mockSetUserFromSSO = vi.fn();
vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({ setUserFromSSO: mockSetUserFromSSO }),
}));

const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('SSOCallback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ shouldAdvanceTime: true });
    localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should show processing state initially', () => {
    window.history.pushState({}, '', '/sso/callback?access=tok&refresh=rtok');
    render(<BrowserRouter><SSOCallback /></BrowserRouter>);
    expect(screen.getByText('SSO Authentication')).toBeInTheDocument();
  });

  it('should handle error parameter and redirect', async () => {
    window.history.pushState({}, '', '/sso/callback?error=invalid');
    render(<BrowserRouter><SSOCallback /></BrowserRouter>);
    await waitFor(() => {
      expect(screen.getByText(/SSO authentication failed/)).toBeInTheDocument();
    });
    expect(screen.getByText('Authentication failed')).toBeInTheDocument();
    expect(screen.getByText('Redirecting to login page...')).toBeInTheDocument();
    // Advance timers to trigger setTimeout redirect
    vi.advanceTimersByTime(3000);
    expect(mockNavigate).toHaveBeenCalledWith('/login');
  });

  it('should handle error with custom message', async () => {
    window.history.pushState({}, '', '/sso/callback?error=custom&message=Custom+error+message');
    render(<BrowserRouter><SSOCallback /></BrowserRouter>);
    await waitFor(() => {
      expect(screen.getByText('Custom error message')).toBeInTheDocument();
    });
  });

  it('should handle pending_approval error and redirect after 8s', async () => {
    window.history.pushState({}, '', '/sso/callback?error=pending_approval');
    render(<BrowserRouter><SSOCallback /></BrowserRouter>);
    await waitFor(() => {
      expect(screen.getByText(/pending admin approval/)).toBeInTheDocument();
    });
    expect(screen.getByText('Account Pending Approval')).toBeInTheDocument();
    vi.advanceTimersByTime(8000);
    expect(mockNavigate).toHaveBeenCalledWith('/login');
  });

  it('should handle missing auth data', async () => {
    window.history.pushState({}, '', '/sso/callback');
    render(<BrowserRouter><SSOCallback /></BrowserRouter>);
    await waitFor(() => {
      expect(screen.getByText('No authentication data received')).toBeInTheDocument();
    });
    vi.advanceTimersByTime(3000);
    expect(mockNavigate).toHaveBeenCalledWith('/login');
  });

  it('should process successful authentication', async () => {
    window.history.pushState({}, '', '/sso/callback?access=access-tok&refresh=refresh-tok');
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: 1, username: 'user' }),
    });

    render(<BrowserRouter><SSOCallback /></BrowserRouter>);
    await waitFor(() => {
      expect(screen.getByText('Success! Redirecting...')).toBeInTheDocument();
    });
    expect(mockSetUserFromSSO).toHaveBeenCalledWith({ id: 1, username: 'user' });
    expect(localStorage.getItem('accessToken')).toBe('access-tok');
    expect(localStorage.getItem('refreshToken')).toBe('refresh-tok');
    vi.advanceTimersByTime(500);
    expect(mockNavigate).toHaveBeenCalledWith('/dashboard', { replace: true });
  });

  it('should handle 403 response and redirect after 8s', async () => {
    window.history.pushState({}, '', '/sso/callback?access=tok&refresh=rtok');
    mockFetch.mockResolvedValue({
      ok: false,
      status: 403,
      json: () => Promise.resolve({ error: 'Not verified' }),
    });

    render(<BrowserRouter><SSOCallback /></BrowserRouter>);
    await waitFor(() => {
      expect(screen.getByText('Not verified')).toBeInTheDocument();
    });
    vi.advanceTimersByTime(8000);
    expect(mockNavigate).toHaveBeenCalledWith('/login');
  });

  it('should handle 403 with fallback message', async () => {
    window.history.pushState({}, '', '/sso/callback?access=tok&refresh=rtok');
    mockFetch.mockResolvedValue({
      ok: false,
      status: 403,
      json: () => Promise.reject(new Error('parse fail')),
    });

    render(<BrowserRouter><SSOCallback /></BrowserRouter>);
    await waitFor(() => {
      expect(screen.getByText(/pending admin approval/)).toBeInTheDocument();
    });
  });

  it('should handle other error responses', async () => {
    window.history.pushState({}, '', '/sso/callback?access=tok&refresh=rtok');
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ error: 'Server error' }),
    });

    render(<BrowserRouter><SSOCallback /></BrowserRouter>);
    await waitFor(() => {
      expect(screen.getByText('Failed to complete authentication. Please try again.')).toBeInTheDocument();
    });
    vi.advanceTimersByTime(3000);
    expect(mockNavigate).toHaveBeenCalledWith('/login');
  });

  it('should handle network error', async () => {
    window.history.pushState({}, '', '/sso/callback?access=tok&refresh=rtok');
    mockFetch.mockRejectedValue(new Error('Network error'));

    render(<BrowserRouter><SSOCallback /></BrowserRouter>);
    await waitFor(() => {
      expect(screen.getByText('Failed to complete authentication. Please try again.')).toBeInTheDocument();
    });
  });
});
