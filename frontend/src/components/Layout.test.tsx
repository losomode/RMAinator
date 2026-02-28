import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Layout from './Layout';

const mockUseAuth = vi.fn();
vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock('../utils/auth', () => ({
  redirectToServices: vi.fn(),
  handleLogout: vi.fn(),
}));

describe('Layout', () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({
      user: { id: 1, username: 'testuser', email: 'test@example.com', role: 'USER' },
      isAdmin: false,
    });
  });

  it('should render the header with RMAinator title', () => {
    render(
      <BrowserRouter>
        <Layout><div>Content</div></Layout>
      </BrowserRouter>
    );
    expect(screen.getByText('🔧 RMAinator')).toBeInTheDocument();
  });

  it('should render navigation items for regular user (no Admin)', () => {
    render(
      <BrowserRouter>
        <Layout><div>Content</div></Layout>
      </BrowserRouter>
    );
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('New RMA')).toBeInTheDocument();
    expect(screen.queryByText('Admin')).not.toBeInTheDocument();
  });

  it('should show Admin nav item for admin users', () => {
    mockUseAuth.mockReturnValue({
      user: { id: 1, username: 'admin', email: 'admin@example.com', role: 'ADMIN' },
      isAdmin: true,
    });
    render(
      <BrowserRouter>
        <Layout><div>Content</div></Layout>
      </BrowserRouter>
    );
    expect(screen.getByText('Admin')).toBeInTheDocument();
  });

  it('should display user info', () => {
    render(
      <BrowserRouter>
        <Layout><div>Content</div></Layout>
      </BrowserRouter>
    );
    expect(screen.getByText('testuser')).toBeInTheDocument();
    expect(screen.getByText('test@example.com')).toBeInTheDocument();
  });

  it('should render children content', () => {
    render(
      <BrowserRouter>
        <Layout><div>My Content</div></Layout>
      </BrowserRouter>
    );
    expect(screen.getByText('My Content')).toBeInTheDocument();
  });

  it('should show Services and Logout buttons', () => {
    render(
      <BrowserRouter>
        <Layout><div>Content</div></Layout>
      </BrowserRouter>
    );
    expect(screen.getByText('← Services')).toBeInTheDocument();
    expect(screen.getByText('Logout')).toBeInTheDocument();
  });

  it('should highlight active nav item', () => {
    window.history.pushState({}, '', '/dashboard');
    render(
      <BrowserRouter>
        <Layout><div>Content</div></Layout>
      </BrowserRouter>
    );
    const dashboardLink = screen.getByText('Dashboard');
    expect(dashboardLink.className).toContain('bg-blue-50');
  });

  it('should not highlight inactive nav item', () => {
    window.history.pushState({}, '', '/rma/new');
    render(
      <BrowserRouter>
        <Layout><div>Content</div></Layout>
      </BrowserRouter>
    );
    const dashboardLink = screen.getByText('Dashboard');
    expect(dashboardLink.className).not.toContain('bg-blue-50');
  });

  it('should render without user info when no user', () => {
    mockUseAuth.mockReturnValue({ user: null, isAdmin: false });
    render(
      <BrowserRouter>
        <Layout><div>Content</div></Layout>
      </BrowserRouter>
    );
    expect(screen.getByText('Content')).toBeInTheDocument();
    expect(screen.queryByText('testuser')).not.toBeInTheDocument();
  });
});
