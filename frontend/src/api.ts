import apiClient from '@inator/shared/api/client';
import type { RMA, RMADevice, AdminDashboardMetrics, StateTimeout } from './types';

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
    rmas: (Omit<RMADevice, 'first_ship_date'> & {
      first_ship_date: string | null;
      priority: string;
    })[];
  }): Promise<void> => {
    await apiClient.post('/rma/group/', data);
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
