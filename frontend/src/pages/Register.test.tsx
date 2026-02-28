import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Register from './Register';

const mockRegister = vi.fn();
vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({ register: mockRegister }),
}));

describe('Register', () => {
  it('should render registration form', () => {
    render(<BrowserRouter><Register /></BrowserRouter>);
    expect(screen.getByRole('heading', { name: 'Register' })).toBeInTheDocument();
    expect(screen.getByText('Username')).toBeInTheDocument();
    expect(screen.getByText('Email')).toBeInTheDocument();
    expect(screen.getByText('First Name')).toBeInTheDocument();
    expect(screen.getByText('Last Name')).toBeInTheDocument();
    expect(screen.getByText('Password')).toBeInTheDocument();
    expect(screen.getByText('Confirm Password')).toBeInTheDocument();
  });

  it('should call register on submit', () => {
    render(<BrowserRouter><Register /></BrowserRouter>);
    fireEvent.submit(screen.getByRole('button', { name: 'Register' }));
    expect(mockRegister).toHaveBeenCalled();
  });

  it('should have login link', () => {
    render(<BrowserRouter><Register /></BrowserRouter>);
    expect(screen.getByRole('link', { name: 'Login' })).toBeInTheDocument();
  });
});
