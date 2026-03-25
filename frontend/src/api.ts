import apiClient from '@inator/shared/api/client';
import type { RMA, RMAGroup, RMADevice, AdminDashboardMetrics, StateTimeout } from './types';

/** RMA CRUD and workflow endpoints. */
export const rmaApi = {
  list: async (params: Record<string, unknown>): Promise<RMA[]> => {
    const response = await apiClient.get<RMA[] | { results: RMA[] }>('/rma/', { params });
    const data = response.data;
    return Array.isArray(data) ? data : data.results;
  },

  create: async (data: Partial<RMA>): Promise<RMA> => {
    const response = await apiClient.post<RMA>('/rma/', data);
    return response.data;
  },

  get: async (id: number | string): Promise<RMA> => {
    const response = await apiClient.get<RMA>(`/rma/${String(id)}/`);
    return response.data;
  },

  update: async (id: number | string, data: Partial<RMA>): Promise<RMA> => {
    const response = await apiClient.patch<RMA>(`/rma/${String(id)}/`, data);
    return response.data;
  },

  delete: async (id: number | string): Promise<void> => {
    await apiClient.delete(`/rma/${String(id)}/`);
  },

  updateState: async (
    id: number | string,
    data: Record<string, unknown>,
  ): Promise<{ rma: RMA }> => {
    const response = await apiClient.post<{ rma: RMA }>(`/rma/${String(id)}/state/`, data);
    return response.data;
  },

  uploadAttachment: async (id: number | string, file: File): Promise<void> => {
    const formData = new FormData();
    formData.append('file', file);
    await apiClient.post(`/rma/${String(id)}/attachments/`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  deleteAttachment: async (attachmentId: number | string): Promise<void> => {
    await apiClient.delete(`/rma/attachments/${String(attachmentId)}/`);
  },

  createGroup: async (data: {
    name?: string;
    company_id: number;
    return_shipping_address?: string;
    rmas: {
      serial_number: string;
      device_type: string;
      ipn?: string;
      fault_notes: string;
      priority?: string;
      company_id: number;
    }[];
  }): Promise<{ group: RMAGroup; rmas: RMA[] }> => {
    const response = await apiClient.post<{ group: RMAGroup; rmas: RMA[] }>('/rma/group/', data);
    return response.data;
  },

  getGroup: async (id: number | string): Promise<RMAGroup> => {
    const response = await apiClient.get<RMAGroup>(`/rma/group/${String(id)}/`);
    return response.data;
  },

  updateGroup: async (
    id: number | string,
    data: { name?: string; return_shipping_address?: string; created_at?: string; also_update_rmas?: boolean },
  ): Promise<RMAGroup> => {
    const response = await apiClient.patch<RMAGroup>(`/rma/group/${String(id)}/`, data);
    return response.data;
  },

  deleteGroup: async (id: number | string): Promise<void> => {
    await apiClient.delete(`/rma/group/${String(id)}/`);
  },

  bulkGroupState: async (
    id: number | string,
    state: string,
    trackingNumber?: string,
    rmaIds?: number[],
  ): Promise<{ message: string; group: RMAGroup }> => {
    const response = await apiClient.post<{ message: string; group: RMAGroup }>(
      `/rma/group/${String(id)}/bulk-state/`,
      {
        state,
        ...(trackingNumber ? { tracking_number: trackingNumber } : {}),
        ...(rmaIds?.length ? { rma_ids: rmaIds } : {}),
      },
    );
    return response.data;
  },

  search: async (params: Record<string, string | number>): Promise<RMA[]> => {
    const response = await apiClient.get<RMA[] | { results: RMA[] }>('/rma/search/', { params });
    const data = response.data;
    return Array.isArray(data) ? data : data.results;
  },

  getAdminDashboard: async (): Promise<AdminDashboardMetrics> => {
    const response = await apiClient.get<AdminDashboardMetrics>('/rma/admin/dashboard/');
    return response.data;
  },
};

/** Admin stale-config CRUD endpoints. */
export const staleConfigApi = {
  list: async (): Promise<StateTimeout[]> => {
    const response = await apiClient.get<StateTimeout[]>('/rma/admin/stale-config/');
    return response.data;
  },

  update: async (id: number, timeoutHours: number): Promise<StateTimeout> => {
    const response = await apiClient.patch<StateTimeout>(`/rma/admin/stale-config/${String(id)}/`, {
      timeout_hours: timeoutHours,
    });
    return response.data;
  },

  create: async (state: string, priority: string, timeoutHours: number): Promise<StateTimeout> => {
    const response = await apiClient.post<StateTimeout>('/rma/admin/stale-config/', {
      state,
      priority,
      timeout_hours: timeoutHours,
    });
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/rma/admin/stale-config/${String(id)}/`);
  },
};
