import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Login from './Login';

const mockLogin = vi.fn();
vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({ login: mockLogin }),
}));

describe('Login', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should render login form', () => {
    render(<BrowserRouter><Login /></BrowserRouter>);
    expect(screen.getByText('RMAinator')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Login' })).toBeInTheDocument();
    expect(screen.getByText('Username')).toBeInTheDocument();
    expect(screen.getByText('Password')).toBeInTheDocument();
  });

  it('should call login on form submit', () => {
    render(<BrowserRouter><Login /></BrowserRouter>);
    fireEvent.submit(screen.getByRole('button', { name: 'Login' }));
    expect(mockLogin).toHaveBeenCalled();
  });

  it('should render SSO buttons', () => {
    render(<BrowserRouter><Login /></BrowserRouter>);
    expect(screen.getByText('Sign in with Google')).toBeInTheDocument();
    expect(screen.getByText('Sign in with Microsoft')).toBeInTheDocument();
  });

  it('should have register link', () => {
    render(<BrowserRouter><Login /></BrowserRouter>);
    expect(screen.getByRole('link', { name: 'Register' })).toBeInTheDocument();
  });

  it('should show OR divider', () => {
    render(<BrowserRouter><Login /></BrowserRouter>);
    expect(screen.getByText('OR')).toBeInTheDocument();
  });
});
