import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        const response = await axios.post(
          `${API_BASE_URL}/api/auth/token/refresh/`,
          { refresh: refreshToken }
        );

        const { access } = response.data;
        localStorage.setItem('accessToken', access);

        originalRequest.headers.Authorization = `Bearer ${access}`;
        return api(originalRequest);
      } catch (refreshError) {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
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
