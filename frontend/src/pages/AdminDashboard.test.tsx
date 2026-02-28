import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import AdminDashboard from './AdminDashboard';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

const mockUseAuth = vi.fn();
vi.mock('../contexts/AuthContext', () => ({ useAuth: () => mockUseAuth() }));

vi.mock('../services/api', () => ({
  rmaAPI: { getAdminDashboard: vi.fn() },
}));

import { rmaAPI } from '../services/api';
const mockGetDashboard = vi.mocked(rmaAPI.getAdminDashboard);

const mockMetrics = {
  summary: { total_rmas: 50, active_rmas: 30, archived_rmas: 20, stale_rmas_count: 5 },
  state_counts: { SUBMITTED: 10, APPROVED: 5 },
  priority_counts: { LOW: 5, NORMAL: 15, HIGH: 10 },
  trends: { last_7_days: 8, last_30_days: 25, last_90_days: 45 },
  stale_rmas: [{ id: 1, rma_number: 'RMA-001', serial_number: 'SN-1', state: 'SUBMITTED', priority: 'HIGH', days_in_state: 10 }],
  recent_activity: [{ rma_number: 'RMA-001', serial_number: 'SN-1', from_state: null, to_state: 'SUBMITTED', changed_by: 'admin', changed_at: '2024-01-01T00:00:00Z', notes: 'Created' }],
};

describe('AdminDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ isAdmin: true });
    mockGetDashboard.mockResolvedValue({ data: mockMetrics } as never);
  });

  it('should redirect non-admin users', () => {
    mockUseAuth.mockReturnValue({ isAdmin: false });
    render(<BrowserRouter><AdminDashboard /></BrowserRouter>);
    expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
  });

  it('should display metrics after loading', async () => {
    render(<BrowserRouter><AdminDashboard /></BrowserRouter>);
    await waitFor(() => {
      expect(screen.getByText('50')).toBeInTheDocument();
    });
    expect(screen.getByText('Total RMAs')).toBeInTheDocument();
    expect(screen.getByText('Active RMAs')).toBeInTheDocument();
    expect(screen.getByText('Stale RMAs')).toBeInTheDocument();
  });

  it('should show state breakdown', async () => {
    render(<BrowserRouter><AdminDashboard /></BrowserRouter>);
    await waitFor(() => {
      expect(screen.getByText('RMAs by State')).toBeInTheDocument();
    });
  });

  it('should show trends', async () => {
    render(<BrowserRouter><AdminDashboard /></BrowserRouter>);
    await waitFor(() => {
      expect(screen.getByText('Last 7 Days')).toBeInTheDocument();
    });
  });

  it('should display stale RMAs', async () => {
    render(<BrowserRouter><AdminDashboard /></BrowserRouter>);
    await waitFor(() => {
      expect(screen.getByText('10 days')).toBeInTheDocument();
    });
  });

  it('should display recent activity with notes', async () => {
    render(<BrowserRouter><AdminDashboard /></BrowserRouter>);
    await waitFor(() => {
      expect(screen.getByText('Created')).toBeInTheDocument();
    });
  });

  it('should handle error loading metrics', async () => {
    mockGetDashboard.mockRejectedValue(new Error('fail'));
    render(<BrowserRouter><AdminDashboard /></BrowserRouter>);
    await waitFor(() => {
      expect(screen.getByText('Failed to load dashboard metrics')).toBeInTheDocument();
    });
  });
});
