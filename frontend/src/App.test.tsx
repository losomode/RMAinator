import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from './App';

vi.mock('./utils/auth', () => ({
  getToken: vi.fn(() => 'test-token'),
  setToken: vi.fn(),
  redirectToLogin: vi.fn(),
}));

vi.mock('./components/Layout', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div data-testid="layout">{children}</div>,
}));

vi.mock('./pages/Dashboard', () => ({ default: () => <div data-testid="dashboard">Dashboard</div> }));
vi.mock('./pages/Profile', () => ({ default: () => <div data-testid="profile">Profile</div> }));
vi.mock('./pages/RMADetail', () => ({ default: () => <div data-testid="rma-detail">RMA Detail</div> }));
vi.mock('./pages/AdminDashboard', () => ({ default: () => <div data-testid="admin">Admin</div> }));
vi.mock('./pages/AdminRMAManagement', () => ({ default: () => <div data-testid="admin-rmas">Admin RMAs</div> }));
vi.mock('./pages/AdminStaleConfig', () => ({ default: () => <div data-testid="admin-config">Admin Config</div> }));
vi.mock('./pages/CreateRMA', () => ({ default: () => <div data-testid="create-rma">Create RMA</div> }));

describe('App', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render dashboard at /dashboard', () => {
    window.history.pushState({}, '', '/dashboard');
    render(<App />);
    expect(screen.getByTestId('dashboard')).toBeInTheDocument();
  });

  it('should render layout wrapper', () => {
    window.history.pushState({}, '', '/dashboard');
    render(<App />);
    expect(screen.getByTestId('layout')).toBeInTheDocument();
  });

  it('should redirect / to /dashboard', () => {
    window.history.pushState({}, '', '/');
    render(<App />);
    expect(screen.getByTestId('dashboard')).toBeInTheDocument();
  });

  it('should show loading when no token and not ready', async () => {
    const authUtils = await import('./utils/auth');
    vi.mocked(authUtils.getToken).mockReturnValue(null);

    render(<App />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('should handle token from URL and remove it', async () => {
    const authUtils = await import('./utils/auth');
    window.history.pushState({}, '', '/dashboard?token=url-token');

    render(<App />);
    expect(authUtils.setToken).toHaveBeenCalledWith('url-token');
    expect(screen.getByTestId('dashboard')).toBeInTheDocument();
  });
});
