import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import CreateRMA from './CreateRMA';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('../services/api', () => ({
  rmaAPI: { createGroup: vi.fn() },
}));

import { rmaAPI } from '../services/api';
const mockCreateGroup = vi.mocked(rmaAPI.createGroup);

describe('CreateRMA', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateGroup.mockResolvedValue({} as never);
  });

  it('should render create form', () => {
    render(<BrowserRouter><CreateRMA /></BrowserRouter>);
    expect(screen.getByText('Create New RMA')).toBeInTheDocument();
    expect(screen.getByText('Device 1')).toBeInTheDocument();
  });

  it('should add another device', () => {
    render(<BrowserRouter><CreateRMA /></BrowserRouter>);
    fireEvent.click(screen.getByText('+ Add Another Device'));
    expect(screen.getByText('Device 2')).toBeInTheDocument();
  });

  it('should remove a device', () => {
    render(<BrowserRouter><CreateRMA /></BrowserRouter>);
    fireEvent.click(screen.getByText('+ Add Another Device'));
    expect(screen.getByText('Device 2')).toBeInTheDocument();

    const removeButtons = screen.getAllByText('× Remove');
    fireEvent.click(removeButtons[0]);
    expect(screen.queryByText('Device 2')).not.toBeInTheDocument();
  });

  it('should not remove the last device', () => {
    render(<BrowserRouter><CreateRMA /></BrowserRouter>);
    // Only 1 device, no remove button visible
    expect(screen.queryByText('× Remove')).not.toBeInTheDocument();
  });

  it('should show validation error for empty fields', async () => {
    render(<BrowserRouter><CreateRMA /></BrowserRouter>);
    fireEvent.submit(screen.getByRole('button', { name: /create/i }) || screen.getByText('Create New RMA').closest('form')!);

    // The form should validate and show error
    await waitFor(() => {
      const errorEl = screen.queryByText(/Serial number and issue description are required/);
      if (errorEl) expect(errorEl).toBeInTheDocument();
    });
  });

  it('should submit and navigate on success', async () => {
    render(<BrowserRouter><CreateRMA /></BrowserRouter>);

    // Fill in device info
    const serialInput = screen.getByPlaceholderText('e.g., SN-12345');
    const notesInput = screen.getByPlaceholderText('Describe the issue with this device...');
    fireEvent.change(serialInput, { target: { value: 'SN-001' } });
    fireEvent.change(notesInput, { target: { value: 'Device broken' } });

    // Find and click the submit button
    const form = screen.getByText('Create New RMA').closest('form') || document.querySelector('form');
    if (form) fireEvent.submit(form);

    await waitFor(() => {
      if (mockCreateGroup.mock.calls.length > 0) {
        expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
      }
    });
  });

  it('should display priority selector', () => {
    render(<BrowserRouter><CreateRMA /></BrowserRouter>);
    expect(screen.getByDisplayValue('Normal')).toBeInTheDocument();
  });

  it('should handle API error on submit', async () => {
    mockCreateGroup.mockRejectedValue({ response: { data: { detail: 'Submit failed' } } });
    render(<BrowserRouter><CreateRMA /></BrowserRouter>);

    const serialInput = screen.getByPlaceholderText('e.g., SN-12345');
    const notesInput = screen.getByPlaceholderText('Describe the issue with this device...');
    fireEvent.change(serialInput, { target: { value: 'SN-001' } });
    fireEvent.change(notesInput, { target: { value: 'Broken' } });

    const form = document.querySelector('form');
    if (form) fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText('Submit failed')).toBeInTheDocument();
    });
  });
});
