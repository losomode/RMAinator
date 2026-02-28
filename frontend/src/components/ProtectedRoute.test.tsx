import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';

const mockUseAuth = vi.fn();
vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

describe('ProtectedRoute', () => {
  it('should show loading when auth is loading', () => {
    mockUseAuth.mockReturnValue({ user: null, loading: true });
    render(
      <BrowserRouter>
        <ProtectedRoute><div>Protected Content</div></ProtectedRoute>
      </BrowserRouter>
    );
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('should redirect to /login when no user', () => {
    mockUseAuth.mockReturnValue({ user: null, loading: false });
    render(
      <BrowserRouter>
        <ProtectedRoute><div>Protected Content</div></ProtectedRoute>
      </BrowserRouter>
    );
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it('should render children when user is authenticated', () => {
    mockUseAuth.mockReturnValue({ user: { id: 1, username: 'test' }, loading: false });
    render(
      <BrowserRouter>
        <ProtectedRoute><div>Protected Content</div></ProtectedRoute>
      </BrowserRouter>
    );
    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });
});
