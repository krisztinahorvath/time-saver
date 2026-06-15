import axios from 'axios';

const BASE_API = import.meta.env.VITE_API_URL ?? 'https://localhost:7051/api';

// Origin of the API server (no /api suffix), used to construct image URLs.
export const API_ORIGIN = BASE_API.replace(/\/api\/?$/, '');

const api = axios.create({
  baseURL: BASE_API,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
