import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import AdminRMAManagement from './AdminRMAManagement';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({ user: { username: 'admin' }, isAdmin: true, logout: vi.fn() }),
}));

vi.mock('../services/api', () => ({
  rmaAPI: { list: vi.fn(), search: vi.fn() },
}));

import { rmaAPI } from '../services/api';
const mockList = vi.mocked(rmaAPI.list);
const mockSearch = vi.mocked(rmaAPI.search);

const mockRMAs = [
  { id: 1, rma_number: 'RMA-001', serial_number: 'SN-1', state: 'SUBMITTED', priority: 'NORMAL', owner: { username: 'user1' }, created_at: '2024-01-01' },
];

describe('AdminRMAManagement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockList.mockResolvedValue({ data: mockRMAs } as never);
  });

  it('should render admin header', async () => {
    render(<BrowserRouter><AdminRMAManagement /></BrowserRouter>);
    await waitFor(() => {
      expect(screen.getByText('Admin - RMA Management')).toBeInTheDocument();
    });
  });

  it('should display RMA table with columns', async () => {
    render(<BrowserRouter><AdminRMAManagement /></BrowserRouter>);
    await waitFor(() => {
      expect(screen.getByText('#RMA-001')).toBeInTheDocument();
    });
    expect(screen.getByText('SN-1')).toBeInTheDocument();
    expect(screen.getByText('user1')).toBeInTheDocument();
    // SUBMITTED appears in both filter options and badge - use getAllByText
    expect(screen.getAllByText('SUBMITTED').length).toBeGreaterThan(0);
    expect(screen.getAllByText('NORMAL').length).toBeGreaterThan(0);
    expect(screen.getByText('View')).toBeInTheDocument();
  });

  it('should show search input', async () => {
    render(<BrowserRouter><AdminRMAManagement /></BrowserRouter>);
    expect(screen.getByPlaceholderText(/Search by RMA/)).toBeInTheDocument();
  });

  it('should perform search with query', async () => {
    mockSearch.mockResolvedValue({ data: [] } as never);
    render(<BrowserRouter><AdminRMAManagement /></BrowserRouter>);
    await waitFor(() => expect(screen.getByText('#RMA-001')).toBeInTheDocument());

    fireEvent.change(screen.getByPlaceholderText(/Search by RMA/), { target: { value: 'test' } });
    fireEvent.click(screen.getByText('Search'));

    await waitFor(() => {
      expect(mockSearch).toHaveBeenCalledWith(expect.objectContaining({ q: 'test' }));
    });
  });

  it('should perform search on Enter key', async () => {
    mockSearch.mockResolvedValue({ data: [] } as never);
    render(<BrowserRouter><AdminRMAManagement /></BrowserRouter>);
    await waitFor(() => expect(screen.getByText('#RMA-001')).toBeInTheDocument());

    const input = screen.getByPlaceholderText(/Search by RMA/);
    fireEvent.change(input, { target: { value: 'test' } });
    fireEvent.keyPress(input, { key: 'Enter', charCode: 13 });

    await waitFor(() => {
      expect(mockSearch).toHaveBeenCalled();
    });
  });

  it('should search with state filter', async () => {
    mockSearch.mockResolvedValue({ data: [] } as never);
    render(<BrowserRouter><AdminRMAManagement /></BrowserRouter>);
    await waitFor(() => expect(screen.getByText('#RMA-001')).toBeInTheDocument());

    fireEvent.change(screen.getByDisplayValue('All States'), { target: { value: 'APPROVED' } });
    fireEvent.click(screen.getByText('Search'));

    await waitFor(() => {
      expect(mockSearch).toHaveBeenCalledWith(expect.objectContaining({ state: 'APPROVED' }));
    });
  });

  it('should search with priority filter', async () => {
    mockSearch.mockResolvedValue({ data: [] } as never);
    render(<BrowserRouter><AdminRMAManagement /></BrowserRouter>);
    await waitFor(() => expect(screen.getByText('#RMA-001')).toBeInTheDocument());

    fireEvent.change(screen.getByDisplayValue('All Priorities'), { target: { value: 'HIGH' } });
    fireEvent.click(screen.getByText('Search'));

    await waitFor(() => {
      expect(mockSearch).toHaveBeenCalledWith(expect.objectContaining({ priority: 'HIGH' }));
    });
  });

  it('should handle search error', async () => {
    mockSearch.mockRejectedValue(new Error('search fail'));
    render(<BrowserRouter><AdminRMAManagement /></BrowserRouter>);
    await waitFor(() => expect(screen.getByText('#RMA-001')).toBeInTheDocument());

    fireEvent.click(screen.getByText('Search'));
    await waitFor(() => {
      expect(screen.getByText('Search failed')).toBeInTheDocument();
    });
  });

  it('should clear filters', async () => {
    render(<BrowserRouter><AdminRMAManagement /></BrowserRouter>);
    await waitFor(() => expect(screen.getByText('#RMA-001')).toBeInTheDocument());

    fireEvent.click(screen.getByText('Clear Filters'));
    expect(mockList).toHaveBeenCalledTimes(2); // initial + clear
  });

  it('should navigate to RMA detail on View click', async () => {
    render(<BrowserRouter><AdminRMAManagement /></BrowserRouter>);
    await waitFor(() => expect(screen.getByText('View')).toBeInTheDocument());

    fireEvent.click(screen.getByText('View'));
    expect(mockNavigate).toHaveBeenCalledWith('/rma/1');
  });

  it('should navigate to admin dashboard', async () => {
    render(<BrowserRouter><AdminRMAManagement /></BrowserRouter>);
    fireEvent.click(screen.getByText('Dashboard'));
    expect(mockNavigate).toHaveBeenCalledWith('/admin');
  });

  it('should navigate to user management', async () => {
    render(<BrowserRouter><AdminRMAManagement /></BrowserRouter>);
    fireEvent.click(screen.getByText('Manage Users'));
    expect(mockNavigate).toHaveBeenCalledWith('/admin/users');
  });

  it('should show empty state', async () => {
    mockList.mockResolvedValue({ data: [] } as never);
    render(<BrowserRouter><AdminRMAManagement /></BrowserRouter>);
    await waitFor(() => {
      expect(screen.getByText('No RMAs found')).toBeInTheDocument();
    });
  });

  it('should handle paginated response', async () => {
    mockList.mockResolvedValue({ data: { results: mockRMAs } } as never);
    render(<BrowserRouter><AdminRMAManagement /></BrowserRouter>);
    await waitFor(() => {
      expect(screen.getByText('#RMA-001')).toBeInTheDocument();
    });
  });

  it('should handle API error', async () => {
    mockList.mockRejectedValue(new Error('fail'));
    render(<BrowserRouter><AdminRMAManagement /></BrowserRouter>);
    await waitFor(() => {
      expect(screen.getByText('Failed to load RMAs')).toBeInTheDocument();
    });
  });

  it('should show RMA count in header', async () => {
    render(<BrowserRouter><AdminRMAManagement /></BrowserRouter>);
    await waitFor(() => {
      expect(screen.getByText('All RMAs (1)')).toBeInTheDocument();
    });
  });
});
