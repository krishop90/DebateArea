import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add a request interceptor to add the auth token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth API
export const auth = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (userData) => api.post('/auth/signup', userData),
  getProfile: () => api.get('/auth/profile'),
  updateProfile: (data) => api.put('/auth/profile', data),
  updatePassword: (data) => api.put('/auth/password', data),
  deleteAccount: () => api.delete('/auth/account'),
  handleSocialCallback: (provider) => api.get(`/auth/${provider}/callback`),
};

// Debates API
export const debates = {
  getAll: (params) => api.get('/debates', { params }),
  getById: (id) => api.get(`/debates/${id}`),
  create: (data) => api.post('/debates', data),
  update: (id, data) => api.put(`/debates/${id}`, data),
  join: (id, data) => api.post(`/debates/${id}/join`, data),
  vote: (id, participantId, value) => api.post(`/debates/${id}/vote`, { participantId, value }),
  updateStatus: (id, status) => api.put(`/debates/${id}/status`, { status }),
  getMyDebates: (type) => api.get(`/debates/my/${type}`),
  getDebateStats: (id) => api.get(`/debates/${id}/stats`),
};

// Comments API
export const comments = {
  getByDebate: (debateId) => api.get(`/debates/${debateId}/comments`),
  create: (debateId, data) => api.post(`/debates/${debateId}/comments`, data),
  update: (debateId, commentId, data) => api.put(`/debates/${debateId}/comments/${commentId}`, data),
  delete: (debateId, commentId) => api.delete(`/debates/${debateId}/comments/${commentId}`),
};

export default api; 