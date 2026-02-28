import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Dashboard from './Dashboard';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('../services/api', () => ({
  rmaAPI: { list: vi.fn() },
}));

import { rmaAPI } from '../services/api';
const mockList = vi.mocked(rmaAPI.list);

const mockRMAs = [
  { id: 1, rma_number: 'RMA-001', serial_number: 'SN-1', state: 'SUBMITTED', priority: 'NORMAL', group_id: null, fault_notes: '', first_ship_date: null, created_at: '2024-01-01', updated_at: '2024-01-01', is_archived: false },
  { id: 2, rma_number: 'RMA-002', serial_number: 'SN-2', state: 'APPROVED', priority: 'HIGH', group_id: 1, fault_notes: '', first_ship_date: null, created_at: '2024-01-02', updated_at: '2024-01-02', is_archived: false },
];

describe('Dashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockList.mockResolvedValue({ data: mockRMAs } as never);
  });

  it('should show loading state', () => {
    mockList.mockImplementation(() => new Promise(() => {}) as never);
    render(<BrowserRouter><Dashboard /></BrowserRouter>);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('should display RMA cards after loading', async () => {
    render(<BrowserRouter><Dashboard /></BrowserRouter>);
    await waitFor(() => {
      expect(screen.getByText('RMA #RMA-001')).toBeInTheDocument();
    });
    expect(screen.getByText('RMA #RMA-002')).toBeInTheDocument();
  });

  it('should show empty state when no RMAs without archived', async () => {
    mockList.mockResolvedValue({ data: [] } as never);
    render(<BrowserRouter><Dashboard /></BrowserRouter>);
    await waitFor(() => {
      expect(screen.getByText('No RMAs found')).toBeInTheDocument();
    });
    // In non-archived view, should show create button
    expect(screen.getByText('Create your first RMA')).toBeInTheDocument();
  });

  it('should show error state', async () => {
    mockList.mockRejectedValue(new Error('fail'));
    render(<BrowserRouter><Dashboard /></BrowserRouter>);
    await waitFor(() => {
      expect(screen.getByText('Failed to load RMAs')).toBeInTheDocument();
    });
  });

  it('should toggle archived view', async () => {
    render(<BrowserRouter><Dashboard /></BrowserRouter>);
    await waitFor(() => {
      expect(screen.getByText('Show Completed')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Show Completed'));
    expect(screen.getByText('Show Active')).toBeInTheDocument();
  });

  it('should switch to group view mode and show grouped RMAs', async () => {
    render(<BrowserRouter><Dashboard /></BrowserRouter>);
    await waitFor(() => {
      expect(screen.getByText('By RMA Group')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('By RMA Group'));
    await waitFor(() => {
      expect(screen.getByText('📦 RMA Group #1')).toBeInTheDocument();
    });
    // Toggle needs 2 clicks to collapse (initial state: undefined, first click: true, second click: false)
    const toggleBtn = screen.getByLabelText('Collapse group');
    fireEvent.click(toggleBtn); // undefined -> true (still expanded)
    fireEvent.click(toggleBtn); // true -> false (collapsed)
    fireEvent.click(screen.getByLabelText('Expand group')); // false -> true (expanded)
  });

  it('should handle paginated response', async () => {
    mockList.mockResolvedValue({ data: { results: mockRMAs } } as never);
    render(<BrowserRouter><Dashboard /></BrowserRouter>);
    await waitFor(() => {
      expect(screen.getByText('RMA #RMA-001')).toBeInTheDocument();
    });
  });

  it('should display group badges for grouped RMAs', async () => {
    render(<BrowserRouter><Dashboard /></BrowserRouter>);
    await waitFor(() => {
      expect(screen.getByText('📦 Group #1')).toBeInTheDocument();
    });
  });

  it('should show archived date for archived RMAs', async () => {
    const archivedRMA = { ...mockRMAs[0], is_archived: true, state: 'COMPLETED' };
    mockList.mockResolvedValue({ data: [archivedRMA] } as never);
    render(<BrowserRouter><Dashboard /></BrowserRouter>);
    await waitFor(() => {
      expect(screen.getByText('RMA #RMA-001')).toBeInTheDocument();
    });
    expect(screen.getByText('Completed:')).toBeInTheDocument();
  });

  it('should navigate to new RMA on button click', async () => {
    render(<BrowserRouter><Dashboard /></BrowserRouter>);
    await waitFor(() => {
      expect(screen.getByText('+ New RMA')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('+ New RMA'));
    expect(mockNavigate).toHaveBeenCalledWith('/rma/new');
  });

  it('should show Create first RMA button in empty state', async () => {
    mockList.mockResolvedValue({ data: [] } as never);
    render(<BrowserRouter><Dashboard /></BrowserRouter>);
    await waitFor(() => {
      expect(screen.getByText('Create your first RMA')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Create your first RMA'));
    expect(mockNavigate).toHaveBeenCalledWith('/rma/new');
  });

  it('should navigate to RMA detail on card click', async () => {
    render(<BrowserRouter><Dashboard /></BrowserRouter>);
    await waitFor(() => {
      expect(screen.getByText('RMA #RMA-001')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('RMA #RMA-001').closest('div[style]')!);
    expect(mockNavigate).toHaveBeenCalledWith('/rma/1');
  });

  it('should handle mouse hover on RMA cards', async () => {
    render(<BrowserRouter><Dashboard /></BrowserRouter>);
    await waitFor(() => {
      expect(screen.getByText('RMA #RMA-001')).toBeInTheDocument();
    });
    const card = screen.getByText('RMA #RMA-001').closest('div[style]')!;
    fireEvent.mouseEnter(card);
    fireEvent.mouseLeave(card);
  });

  it('should display REJECTED state color', async () => {
    const rejectedRMA = { ...mockRMAs[0], state: 'REJECTED' };
    mockList.mockResolvedValue({ data: [rejectedRMA] } as never);
    render(<BrowserRouter><Dashboard /></BrowserRouter>);
    await waitFor(() => {
      expect(screen.getByText('REJECTED')).toBeInTheDocument();
    });
  });

  it('should show ungrouped RMAs in group view', async () => {
    const ungroupedRMA = { ...mockRMAs[0], group_id: null };
    mockList.mockResolvedValue({ data: [ungroupedRMA, mockRMAs[1]] } as never);
    render(<BrowserRouter><Dashboard /></BrowserRouter>);
    await waitFor(() => expect(screen.getByText('RMA #RMA-001')).toBeInTheDocument());

    fireEvent.click(screen.getByText('By RMA Group'));
    await waitFor(() => {
      expect(screen.getByText('Individual RMAs')).toBeInTheDocument();
    });
  });
});
