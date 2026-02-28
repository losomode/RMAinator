import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import RMADetail from './RMADetail';

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useParams: () => ({ id: '1' }), useNavigate: () => vi.fn() };
});

const mockUseAuth = vi.fn();
vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock('../services/api', () => ({
  rmaAPI: { get: vi.fn(), updateState: vi.fn(), update: vi.fn() },
}));

import { rmaAPI } from '../services/api';
const mockGet = vi.mocked(rmaAPI.get);
const mockUpdateState = vi.mocked(rmaAPI.updateState);
const mockUpdate = vi.mocked(rmaAPI.update);

const mockRMA = {
  id: 1, rma_number: 'RMA-001', serial_number: 'SN-123', state: 'SUBMITTED' as const,
  priority: 'HIGH' as const, group_id: 1, fault_notes: 'Device not working',
  first_ship_date: '2024-01-01', created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-02T00:00:00Z', is_archived: false,
  rejection_reason: undefined,
  attachments: [{ id: 1, filename: 'photo.jpg', file_size: 2048 }],
  state_history: [
    { id: 1, from_state: null, to_state: 'SUBMITTED' as const, changed_at: '2024-01-01T00:00:00Z', changed_by: { username: 'admin' }, notes: 'Created' },
  ],
};

describe('RMADetail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ isAdmin: false });
    mockGet.mockResolvedValue({ data: mockRMA } as never);
    vi.spyOn(window, 'confirm').mockReturnValue(true);
  });

  it('should show loading state', () => {
    mockGet.mockImplementation(() => new Promise(() => {}) as never);
    render(<BrowserRouter><RMADetail /></BrowserRouter>);
    expect(screen.getByText('Loading RMA details...')).toBeInTheDocument();
  });

  it('should display RMA details after loading', async () => {
    render(<BrowserRouter><RMADetail /></BrowserRouter>);
    await waitFor(() => {
      expect(screen.getByText('RMA #RMA-001')).toBeInTheDocument();
    });
    expect(screen.getByText('SN-123')).toBeInTheDocument();
    expect(screen.getAllByText('SUBMITTED').length).toBeGreaterThan(0);
    expect(screen.getByText('Device not working')).toBeInTheDocument();
  });

  it('should display group badge', async () => {
    render(<BrowserRouter><RMADetail /></BrowserRouter>);
    await waitFor(() => {
      expect(screen.getByText('📦 Group #1')).toBeInTheDocument();
    });
  });

  it('should display state history', async () => {
    render(<BrowserRouter><RMADetail /></BrowserRouter>);
    await waitFor(() => {
      expect(screen.getByText('Status History')).toBeInTheDocument();
    });
    expect(screen.getByText('Created')).toBeInTheDocument();
  });

  it('should display attachments', async () => {
    render(<BrowserRouter><RMADetail /></BrowserRouter>);
    await waitFor(() => {
      expect(screen.getByText(/photo\.jpg/)).toBeInTheDocument();
    });
  });

  it('should show error state with back button', async () => {
    mockGet.mockRejectedValue(new Error('fail'));
    render(<BrowserRouter><RMADetail /></BrowserRouter>);
    await waitFor(() => {
      expect(screen.getByText('Failed to load RMA details')).toBeInTheDocument();
    });
    expect(screen.getByText('Back to Dashboard')).toBeInTheDocument();
  });

  it('should display rejection reason for rejected RMAs', async () => {
    mockGet.mockResolvedValue({ data: { ...mockRMA, state: 'REJECTED', rejection_reason: 'Invalid serial' } } as never);
    render(<BrowserRouter><RMADetail /></BrowserRouter>);
    await waitFor(() => {
      expect(screen.getByText('Invalid serial')).toBeInTheDocument();
    });
  });

  it('should show completed label for archived completed RMAs', async () => {
    mockGet.mockResolvedValue({ data: { ...mockRMA, state: 'COMPLETED', is_archived: true } } as never);
    render(<BrowserRouter><RMADetail /></BrowserRouter>);
    await waitFor(() => {
      expect(screen.getByText('Completed:')).toBeInTheDocument();
    });
  });

  it('should show empty history message', async () => {
    mockGet.mockResolvedValue({ data: { ...mockRMA, state_history: [] } } as never);
    render(<BrowserRouter><RMADetail /></BrowserRouter>);
    await waitFor(() => {
      expect(screen.getByText('No status history available')).toBeInTheDocument();
    });
  });

  it('should show N/A for null first_ship_date', async () => {
    mockGet.mockResolvedValue({ data: { ...mockRMA, first_ship_date: null } } as never);
    render(<BrowserRouter><RMADetail /></BrowserRouter>);
    await waitFor(() => {
      expect(screen.getByText('N/A')).toBeInTheDocument();
    });
  });

  it('should show no description provided when fault_notes empty', async () => {
    mockGet.mockResolvedValue({ data: { ...mockRMA, fault_notes: '' } } as never);
    render(<BrowserRouter><RMADetail /></BrowserRouter>);
    await waitFor(() => {
      expect(screen.getByText('No description provided')).toBeInTheDocument();
    });
  });

  it('should display RMA without group badge', async () => {
    mockGet.mockResolvedValue({ data: { ...mockRMA, group_id: null } } as never);
    render(<BrowserRouter><RMADetail /></BrowserRouter>);
    await waitFor(() => {
      expect(screen.getByText('RMA #RMA-001')).toBeInTheDocument();
    });
    expect(screen.queryByText(/Group #/)).not.toBeInTheDocument();
  });

  it('should display RMA without attachments', async () => {
    mockGet.mockResolvedValue({ data: { ...mockRMA, attachments: [] } } as never);
    render(<BrowserRouter><RMADetail /></BrowserRouter>);
    await waitFor(() => {
      expect(screen.getByText('RMA #RMA-001')).toBeInTheDocument();
    });
    expect(screen.queryByText(/photo\.jpg/)).not.toBeInTheDocument();
  });

  it('should show Closed label for non-completed archived RMAs', async () => {
    mockGet.mockResolvedValue({ data: { ...mockRMA, state: 'REJECTED', is_archived: true } } as never);
    render(<BrowserRouter><RMADetail /></BrowserRouter>);
    await waitFor(() => {
      expect(screen.getByText('Closed:')).toBeInTheDocument();
    });
  });

  it('should display LOW priority badge', async () => {
    mockGet.mockResolvedValue({ data: { ...mockRMA, priority: 'LOW' } } as never);
    render(<BrowserRouter><RMADetail /></BrowserRouter>);
    await waitFor(() => {
      expect(screen.getByText('LOW')).toBeInTheDocument();
    });
  });

  it('should display timeline line between history items', async () => {
    const multiHistory = {
      ...mockRMA,
      state_history: [
        { id: 1, from_state: null, to_state: 'SUBMITTED' as const, changed_at: '2024-01-01T00:00:00Z', changed_by: { username: 'admin' }, notes: 'Created' },
        { id: 2, from_state: 'SUBMITTED' as const, to_state: 'APPROVED' as const, changed_at: '2024-01-02T00:00:00Z', changed_by: { username: 'admin' }, notes: 'Approved' },
      ],
    };
    mockGet.mockResolvedValue({ data: multiHistory } as never);
    render(<BrowserRouter><RMADetail /></BrowserRouter>);
    await waitFor(() => {
      expect(screen.getByText('Created')).toBeInTheDocument();
      expect(screen.getByText('Approved')).toBeInTheDocument();
    });
  });

  // --- Admin controls tests ---

  it('should not show admin controls for non-admin users', async () => {
    render(<BrowserRouter><RMADetail /></BrowserRouter>);
    await waitFor(() => expect(screen.getByText('RMA #RMA-001')).toBeInTheDocument());
    expect(screen.queryByText('Update Status')).not.toBeInTheDocument();
    expect(screen.queryByText('Admin Fields')).not.toBeInTheDocument();
  });

  it('should show state transition controls for admin', async () => {
    mockUseAuth.mockReturnValue({ isAdmin: true });
    render(<BrowserRouter><RMADetail /></BrowserRouter>);
    await waitFor(() => expect(screen.getByText('Update Status')).toBeInTheDocument());
    expect(screen.getByTestId('transition-approved')).toBeInTheDocument();
    expect(screen.getByTestId('transition-rejected')).toBeInTheDocument();
  });

  it('should show Admin Fields section for admin', async () => {
    mockUseAuth.mockReturnValue({ isAdmin: true });
    render(<BrowserRouter><RMADetail /></BrowserRouter>);
    await waitFor(() => expect(screen.getByText('Admin Fields')).toBeInTheDocument());
    expect(screen.getByTestId('edit-fields-btn')).toBeInTheDocument();
  });

  it('should transition state on button click', async () => {
    mockUseAuth.mockReturnValue({ isAdmin: true });
    const updatedRMA = { ...mockRMA, state: 'APPROVED' as const };
    mockUpdateState.mockResolvedValue({ data: { rma: updatedRMA } } as never);
    render(<BrowserRouter><RMADetail /></BrowserRouter>);
    await waitFor(() => expect(screen.getByTestId('transition-approved')).toBeInTheDocument());

    fireEvent.click(screen.getByTestId('transition-approved'));
    await waitFor(() => {
      expect(mockUpdateState).toHaveBeenCalledWith('1', expect.objectContaining({ state: 'APPROVED' }));
    });
  });

  it('should require rejection reason for REJECTED transition', async () => {
    mockUseAuth.mockReturnValue({ isAdmin: true });
    render(<BrowserRouter><RMADetail /></BrowserRouter>);
    await waitFor(() => expect(screen.getByTestId('transition-rejected')).toBeInTheDocument());

    fireEvent.click(screen.getByTestId('transition-rejected'));
    await waitFor(() => {
      expect(screen.getByText('Rejection reason is required')).toBeInTheDocument();
    });
    expect(mockUpdateState).not.toHaveBeenCalled();
  });

  it('should reject with reason when provided', async () => {
    mockUseAuth.mockReturnValue({ isAdmin: true });
    const rejectedRMA = { ...mockRMA, state: 'REJECTED' as const };
    mockUpdateState.mockResolvedValue({ data: { rma: rejectedRMA } } as never);
    mockUpdate.mockResolvedValue({ data: rejectedRMA } as never);
    render(<BrowserRouter><RMADetail /></BrowserRouter>);
    await waitFor(() => expect(screen.getByTestId('rejection-reason')).toBeInTheDocument());

    fireEvent.change(screen.getByTestId('rejection-reason'), { target: { value: 'Bad serial' } });
    fireEvent.click(screen.getByTestId('transition-rejected'));
    await waitFor(() => {
      expect(mockUpdateState).toHaveBeenCalledWith('1', expect.objectContaining({ state: 'REJECTED' }));
    });
  });

  it('should show state transition error on failure', async () => {
    mockUseAuth.mockReturnValue({ isAdmin: true });
    mockUpdateState.mockRejectedValue({ response: { data: { error: 'Transition failed' } } });
    render(<BrowserRouter><RMADetail /></BrowserRouter>);
    await waitFor(() => expect(screen.getByTestId('transition-approved')).toBeInTheDocument());

    fireEvent.click(screen.getByTestId('transition-approved'));
    await waitFor(() => {
      expect(screen.getByText('Transition failed')).toBeInTheDocument();
    });
  });

  it('should not show Update Status for archived RMAs', async () => {
    mockUseAuth.mockReturnValue({ isAdmin: true });
    mockGet.mockResolvedValue({ data: { ...mockRMA, state: 'COMPLETED', is_archived: true } } as never);
    render(<BrowserRouter><RMADetail /></BrowserRouter>);
    await waitFor(() => expect(screen.getByText('Admin Fields')).toBeInTheDocument());
    expect(screen.queryByText('Update Status')).not.toBeInTheDocument();
  });

  it('should enable editing admin fields and save', async () => {
    mockUseAuth.mockReturnValue({ isAdmin: true });
    mockUpdate.mockResolvedValue({ data: { ...mockRMA, priority: 'LOW' } } as never);
    render(<BrowserRouter><RMADetail /></BrowserRouter>);
    await waitFor(() => expect(screen.getByTestId('edit-fields-btn')).toBeInTheDocument());

    fireEvent.click(screen.getByTestId('edit-fields-btn'));
    expect(screen.getByTestId('save-fields-btn')).toBeInTheDocument();

    fireEvent.change(screen.getByTestId('admin-root-cause'), { target: { value: 'Overheating' } });
    fireEvent.click(screen.getByTestId('save-fields-btn'));
    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith('1', expect.objectContaining({ root_cause: 'Overheating' }));
    });
  });

  it('should show save error on field save failure', async () => {
    mockUseAuth.mockReturnValue({ isAdmin: true });
    mockUpdate.mockRejectedValue(new Error('fail'));
    render(<BrowserRouter><RMADetail /></BrowserRouter>);
    await waitFor(() => expect(screen.getByTestId('edit-fields-btn')).toBeInTheDocument());

    fireEvent.click(screen.getByTestId('edit-fields-btn'));
    fireEvent.click(screen.getByTestId('save-fields-btn'));
    await waitFor(() => {
      expect(screen.getByText('Failed to save fields')).toBeInTheDocument();
    });
  });

  it('should cancel editing and revert fields', async () => {
    mockUseAuth.mockReturnValue({ isAdmin: true });
    render(<BrowserRouter><RMADetail /></BrowserRouter>);
    await waitFor(() => expect(screen.getByTestId('edit-fields-btn')).toBeInTheDocument());

    fireEvent.click(screen.getByTestId('edit-fields-btn'));
    fireEvent.change(screen.getByTestId('admin-root-cause'), { target: { value: 'changed' } });
    fireEvent.click(screen.getByText('Cancel'));
    expect(screen.queryByTestId('save-fields-btn')).not.toBeInTheDocument();
  });

  it('should handle generic state transition error', async () => {
    mockUseAuth.mockReturnValue({ isAdmin: true });
    mockUpdateState.mockRejectedValue(new Error('network error'));
    render(<BrowserRouter><RMADetail /></BrowserRouter>);
    await waitFor(() => expect(screen.getByTestId('transition-approved')).toBeInTheDocument());

    fireEvent.click(screen.getByTestId('transition-approved'));
    await waitFor(() => {
      expect(screen.getByText('Failed to update state')).toBeInTheDocument();
    });
  });

  it('should allow editing all admin field types', async () => {
    mockUseAuth.mockReturnValue({ isAdmin: true });
    render(<BrowserRouter><RMADetail /></BrowserRouter>);
    await waitFor(() => expect(screen.getByTestId('edit-fields-btn')).toBeInTheDocument());

    fireEvent.click(screen.getByTestId('edit-fields-btn'));

    // Text inputs
    fireEvent.change(screen.getByTestId('admin-cost-to-repair'), { target: { value: '$50' } });
    fireEvent.change(screen.getByTestId('admin-tx2-mac'), { target: { value: 'AA:BB:CC:DD:EE:FF' } });
    fireEvent.change(screen.getByTestId('admin-parts-replaced'), { target: { value: 'Fan assembly' } });

    // Date inputs
    fireEvent.change(screen.getByTestId('admin-rma-received-date'), { target: { value: '2024-06-01' } });
    fireEvent.change(screen.getByTestId('admin-return-date'), { target: { value: '2024-06-15' } });

    // Select
    fireEvent.change(screen.getByTestId('admin-priority'), { target: { value: 'LOW' } });

    // Checkboxes
    fireEvent.click(screen.getByTestId('admin-script-ran'));
    fireEvent.click(screen.getByTestId('admin-services-enabled'));
    fireEvent.click(screen.getByTestId('admin-uptime-good'));
    fireEvent.click(screen.getByTestId('admin-stream-good'));
    fireEvent.click(screen.getByTestId('admin-ship-ready'));

    // Verify fields are present
    expect(screen.getByTestId('admin-cost-to-repair')).toHaveValue('$50');
    expect(screen.getByTestId('admin-priority')).toHaveValue('LOW');
  });

  it('should add transition notes when changing state', async () => {
    mockUseAuth.mockReturnValue({ isAdmin: true });
    const updatedRMA = { ...mockRMA, state: 'APPROVED' as const };
    mockUpdateState.mockResolvedValue({ data: { rma: updatedRMA } } as never);
    render(<BrowserRouter><RMADetail /></BrowserRouter>);
    await waitFor(() => expect(screen.getByTestId('transition-notes')).toBeInTheDocument());

    fireEvent.change(screen.getByTestId('transition-notes'), { target: { value: 'Looks good' } });
    fireEvent.click(screen.getByTestId('transition-approved'));
    await waitFor(() => {
      expect(mockUpdateState).toHaveBeenCalledWith('1', { state: 'APPROVED', notes: 'Looks good' });
    });
  });

  it('should handle state validation error from API', async () => {
    mockUseAuth.mockReturnValue({ isAdmin: true });
    mockUpdateState.mockRejectedValue({ response: { data: { state: ['Invalid transition'] } } });
    render(<BrowserRouter><RMADetail /></BrowserRouter>);
    await waitFor(() => expect(screen.getByTestId('transition-approved')).toBeInTheDocument());

    fireEvent.click(screen.getByTestId('transition-approved'));
    await waitFor(() => {
      expect(screen.getByText('Invalid transition')).toBeInTheDocument();
    });
  });

  it('should show admin revert dropdown only for revertable states', async () => {
    mockUseAuth.mockReturnValue({ isAdmin: true });
    mockGet.mockResolvedValue({ data: { ...mockRMA, state: 'DIAGNOSED' } } as never);
    render(<BrowserRouter><RMADetail /></BrowserRouter>);
    await waitFor(() => expect(screen.getByTestId('admin-revert-select')).toBeInTheDocument());
    const select = screen.getByTestId('admin-revert-select') as HTMLSelectElement;
    const options = Array.from(select.options).map(o => o.value);
    // Should only contain states earlier than DIAGNOSED
    expect(options).toContain('SUBMITTED');
    expect(options).toContain('APPROVED');
    expect(options).toContain('RECEIVED');
    // Should NOT contain DIAGNOSED or later states
    expect(options).not.toContain('DIAGNOSED');
    expect(options).not.toContain('SHIPPED');
  });

  it('should not show revert dropdown for SUBMITTED state', async () => {
    mockUseAuth.mockReturnValue({ isAdmin: true });
    render(<BrowserRouter><RMADetail /></BrowserRouter>);
    await waitFor(() => expect(screen.getByText('Update Status')).toBeInTheDocument());
    expect(screen.queryByTestId('admin-revert-select')).not.toBeInTheDocument();
  });

  it('should revert state with confirmation', async () => {
    mockUseAuth.mockReturnValue({ isAdmin: true });
    mockGet.mockResolvedValue({ data: { ...mockRMA, state: 'DIAGNOSED' } } as never);
    const revertedRMA = { ...mockRMA, state: 'RECEIVED' as const };
    mockUpdateState.mockResolvedValue({ data: { rma: revertedRMA } } as never);
    render(<BrowserRouter><RMADetail /></BrowserRouter>);
    await waitFor(() => expect(screen.getByTestId('admin-revert-select')).toBeInTheDocument());

    fireEvent.change(screen.getByTestId('admin-revert-select'), { target: { value: 'RECEIVED' } });
    fireEvent.click(screen.getByTestId('admin-revert-btn'));
    await waitFor(() => {
      expect(window.confirm).toHaveBeenCalledWith('This violates normal RMA workflow. Are you sure?');
      expect(mockUpdateState).toHaveBeenCalledWith('1', expect.objectContaining({ state: 'RECEIVED' }));
    });
  });

  it('should cancel revert when confirmation declined', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    mockUseAuth.mockReturnValue({ isAdmin: true });
    mockGet.mockResolvedValue({ data: { ...mockRMA, state: 'DIAGNOSED' } } as never);
    render(<BrowserRouter><RMADetail /></BrowserRouter>);
    await waitFor(() => expect(screen.getByTestId('admin-revert-select')).toBeInTheDocument());

    fireEvent.change(screen.getByTestId('admin-revert-select'), { target: { value: 'RECEIVED' } });
    fireEvent.click(screen.getByTestId('admin-revert-btn'));
    expect(mockUpdateState).not.toHaveBeenCalled();
  });

  it('should show close confirmation for terminal state transitions', async () => {
    mockUseAuth.mockReturnValue({ isAdmin: true });
    const updatedRMA = { ...mockRMA, state: 'APPROVED' as const };
    mockUpdateState.mockResolvedValue({ data: { rma: updatedRMA } } as never);
    render(<BrowserRouter><RMADetail /></BrowserRouter>);
    await waitFor(() => expect(screen.getByTestId('transition-rejected')).toBeInTheDocument());

    fireEvent.change(screen.getByTestId('rejection-reason'), { target: { value: 'Invalid' } });
    fireEvent.click(screen.getByTestId('transition-rejected'));
    expect(window.confirm).toHaveBeenCalledWith('Are you sure you want to close this RMA? This cannot be undone.');
  });

  it('should cancel close when confirmation declined', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    mockUseAuth.mockReturnValue({ isAdmin: true });
    render(<BrowserRouter><RMADetail /></BrowserRouter>);
    await waitFor(() => expect(screen.getByTestId('transition-rejected')).toBeInTheDocument());

    fireEvent.change(screen.getByTestId('rejection-reason'), { target: { value: 'Invalid' } });
    fireEvent.click(screen.getByTestId('transition-rejected'));
    expect(mockUpdateState).not.toHaveBeenCalled();
  });

  it('should not show admin revert for non-admin', async () => {
    mockGet.mockResolvedValue({ data: { ...mockRMA, state: 'DIAGNOSED' } } as never);
    render(<BrowserRouter><RMADetail /></BrowserRouter>);
    await waitFor(() => expect(screen.getByText('RMA #RMA-001')).toBeInTheDocument());
    expect(screen.queryByTestId('admin-revert-select')).not.toBeInTheDocument();
  });

  it('should not submit revert when no state selected', async () => {
    mockUseAuth.mockReturnValue({ isAdmin: true });
    mockGet.mockResolvedValue({ data: { ...mockRMA, state: 'DIAGNOSED' } } as never);
    render(<BrowserRouter><RMADetail /></BrowserRouter>);
    await waitFor(() => expect(screen.getByTestId('admin-revert-btn')).toBeInTheDocument());
    expect(screen.getByTestId('admin-revert-btn')).toBeDisabled();
  });
});
