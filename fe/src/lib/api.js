import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5000',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true
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
  logout: () => api.post('/auth/logout'),
  getProfile: () => api.get('/auth/profile'),
  updateProfile: (data) => api.put('/auth/profile', data),
  googleAuth: () => window.location.href = 'http://localhost:5000/auth/google',
  githubAuth: () => window.location.href = 'http://localhost:5000/auth/github'
};

// Debates API
export const debates = {
  create: (data) => api.post('/debates', data),
  getAll: (params) => api.get('/debates', { params }),
  getById: (id) => api.get(`/debates/${id}`),
  join: (id, role) => api.post(`/debates/${id}/join`, { role }),
  vote: (id, data) => api.post(`/debates/${id}/vote`, data),
  sendMessage: (id, data) => api.post(`/debates/${id}/messages`, data),
  getMyDebates: (params) => api.get('/debates/my-debates', { params }),
  startTimer: (id) => api.post(`/debates/${id}/start`),
  endDebate: (id) => api.post(`/debates/${id}/end`),
  requestResults: (id) => api.post(`/debates/${id}/request-results`)
};

// Comments API
export const comments = {
  getByDebate: (debateId) => api.get(`/debates/${debateId}/comments`),
  create: (debateId, data) => api.post(`/debates/${debateId}/comments`, data),
  update: (debateId, commentId, data) => api.put(`/debates/${debateId}/comments/${commentId}`, data),
  delete: (debateId, commentId) => api.delete(`/debates/${debateId}/comments/${commentId}`),
};

export const categories = {
  getAll: () => api.get('/categories')
};

export default api; 