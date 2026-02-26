import axios from 'axios';
import { getToken, redirectToLogin } from '../utils/auth';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8001';

const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle authentication errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Token is invalid or expired, redirect to Authinator login
      redirectToLogin();
      return Promise.reject(error);
    }

    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  register: (data) => api.post('/auth/register/', data),
  login: (data) => api.post('/auth/login/', data),
  getCurrentUser: () => api.get('/auth/me/'),
  updateProfile: (data) => api.patch('/auth/me/', data),
  getPendingUsers: () => api.get('/auth/pending/'),
  approveUser: (userId, approve) => 
    api.post(`/auth/${userId}/approve/`, { approve }),
};

// RMA API
export const rmaAPI = {
  list: (params) => api.get('/rma/', { params }),
  create: (data) => api.post('/rma/', data),
  get: (id) => api.get(`/rma/${id}/`),
  update: (id, data) => api.patch(`/rma/${id}/`, data),
  delete: (id) => api.delete(`/rma/${id}/`),
  updateState: (id, data) => api.post(`/rma/${id}/state/`, data),
  uploadAttachment: (id, file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post(`/rma/${id}/attachments/`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  deleteAttachment: (attachmentId) => 
    api.delete(`/rma/attachments/${attachmentId}/`),
  createGroup: (data) => api.post('/rma/group/', data),
  search: (params) => api.get('/rma/search/', { params }),
  getAdminDashboard: () => api.get('/rma/admin/dashboard/'),
};

export default api;
