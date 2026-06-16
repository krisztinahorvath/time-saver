import axios from 'axios';
import type { InternalAxiosRequestConfig } from 'axios';

const BASE_API = import.meta.env.VITE_API_URL ?? 'https://localhost:7051/api';

// Origin of the API server (no /api suffix), used to construct image URLs.
export const API_ORIGIN = BASE_API.replace(/\/api\/?$/, '');

// Separate instance used only for token-refresh calls (avoids interceptor loops).
const refreshApi = axios.create({ baseURL: BASE_API });

const api = axios.create({ baseURL: BASE_API });

// ── Request: attach access token ─────────────────────────────────────────────
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ── Response: handle 401 with token refresh ──────────────────────────────────
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (err: unknown) => void;
}> = [];

function processQueue(error: unknown, token: string | null) {
  failedQueue.forEach(({ resolve, reject }) => {
    if (token) resolve(token);
    else reject(error);
  });
  failedQueue = [];
}

function clearSession() {
  localStorage.removeItem('token');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
  window.location.href = '/login';
}

interface RetryConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config as RetryConfig;

    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    // Don't attempt refresh on auth endpoints themselves.
    // For /Login failures (wrong password), just propagate the error so the
    // Login component's catch block can display the message — no redirect.
    // For /refresh and /logout failures, the session is already invalid so clear it.
    const url = originalRequest.url ?? '';
    if (url.includes('/Login')) {
      return Promise.reject(error);
    }
    if (url.includes('/refresh') || url.includes('/logout')) {
      clearSession();
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise<string>((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      }).then((token) => {
        originalRequest.headers.Authorization = `Bearer ${token}`;
        return api(originalRequest);
      }).catch((err) => Promise.reject(err));
    }

    originalRequest._retry = true;
    isRefreshing = true;

    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) {
      isRefreshing = false;
      clearSession();
      return Promise.reject(error);
    }

    try {
      const res = await refreshApi.post<{ accessToken: string; refreshToken: string }>(
        '/Users/refresh',
        { refreshToken },
      );
      const { accessToken, refreshToken: newRefreshToken } = res.data;
      localStorage.setItem('token', accessToken);
      localStorage.setItem('refreshToken', newRefreshToken);
      api.defaults.headers.common.Authorization = `Bearer ${accessToken}`;
      processQueue(null, accessToken);
      originalRequest.headers.Authorization = `Bearer ${accessToken}`;
      return api(originalRequest);
    } catch (refreshError) {
      processQueue(refreshError, null);
      clearSession();
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  },
);

export default api;
