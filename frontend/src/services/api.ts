import axios, { AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { getToken, redirectToLogin } from '../utils/auth';
import type { User, RMA, AdminDashboardMetrics, ProfileUpdateData, RMADevice } from '../types';

const API_BASE_URL: string = import.meta.env.VITE_API_URL || 'http://localhost:8002';

const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: unknown) => Promise.reject(error)
);

// Response interceptor to handle authentication errors
api.interceptors.response.use(
  (response) => response,
  async (error: unknown) => {
    const axiosError = error as { response?: { status: number } };
    if (axiosError.response?.status === 401) {
      // Token is invalid or expired, redirect to Authinator login
      redirectToLogin();
      return Promise.reject(error);
    }

    return Promise.reject(error);
  }
);

// Auth API - calls Authinator directly
const AUTHINATOR_URL: string = import.meta.env.VITE_AUTHINATOR_URL || 'http://localhost:8001';
export const authAPI = {
  register: (data: Record<string, string>): Promise<AxiosResponse> => api.post('/auth/register/', data),
  login: (data: Record<string, string>): Promise<AxiosResponse> => api.post('/auth/login/', data),
  getCurrentUser: (): Promise<AxiosResponse<User>> => {
    const token = getToken();
    return axios.get<User>(`${AUTHINATOR_URL}/api/auth/me/`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  },
  updateProfile: (data: ProfileUpdateData): Promise<AxiosResponse<{ user: User; message: string }>> => api.patch('/auth/me/', data),
  getPendingUsers: (): Promise<AxiosResponse<User[] | { results: User[] }>> => api.get('/auth/pending/'),
  approveUser: (userId: number, approve: boolean): Promise<AxiosResponse> => api.post(`/auth/${userId}/approve/`, { approve }),
};

// RMA API
export const rmaAPI = {
  list: (params: Record<string, unknown>): Promise<AxiosResponse<RMA[] | { results: RMA[] }>> => api.get('/rma/', { params }),
  create: (data: Partial<RMA>): Promise<AxiosResponse<RMA>> => api.post('/rma/', data),
  get: (id: number | string): Promise<AxiosResponse<RMA>> => api.get(`/rma/${id}/`),
  update: (id: number | string, data: Partial<RMA>): Promise<AxiosResponse<RMA>> => api.patch(`/rma/${id}/`, data),
  delete: (id: number | string): Promise<AxiosResponse> => api.delete(`/rma/${id}/`),
  updateState: (id: number | string, data: Record<string, unknown>): Promise<AxiosResponse> => api.post(`/rma/${id}/state/`, data),
  uploadAttachment: (id: number | string, file: File): Promise<AxiosResponse> => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post(`/rma/${id}/attachments/`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  deleteAttachment: (attachmentId: number | string): Promise<AxiosResponse> => api.delete(`/rma/attachments/${attachmentId}/`),
  createGroup: (data: { rmas: (Omit<RMADevice, 'first_ship_date'> & { first_ship_date: string | null; priority: string })[] }): Promise<AxiosResponse> => api.post('/rma/group/', data),
  search: (params: Record<string, string>): Promise<AxiosResponse<RMA[] | { results: RMA[] }>> => api.get('/rma/search/', { params }),
  getAdminDashboard: (): Promise<AxiosResponse<AdminDashboardMetrics>> => api.get('/rma/admin/dashboard/'),
};

export default api;
