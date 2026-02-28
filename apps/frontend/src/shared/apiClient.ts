// src/shared/apiClient.ts
// Axios client with JWT interceptors and auto-refresh on 401

import axios, { AxiosError, AxiosInstance, AxiosResponse } from 'axios';
import { API_URL } from './config';

// === TOKEN STORAGE ===

export const tokenStorage = {
  getAccess(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('accessToken');
  },

  getRefresh(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('refreshToken');
  },

  setTokens(accessToken: string, refreshToken: string): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
  },

  clearTokens(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  },
};

// === API ERROR TYPE ===

export class ApiRequestError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public path?: string,
  ) {
    super(message);
    this.name = 'ApiRequestError';
  }
}

// === REFRESH QUEUE ===
// Prevents concurrent refresh calls when multiple 401s occur simultaneously

let refreshPromise: Promise<{ accessToken: string; refreshToken: string }> | null = null;

async function performRefresh(): Promise<{ accessToken: string; refreshToken: string }> {
  const refreshToken = tokenStorage.getRefresh();
  if (!refreshToken) {
    throw new ApiRequestError(401, 'No refresh token available');
  }

  try {
    // Use plain fetch to avoid re-entering the axios interceptor
    const response = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
      credentials: 'include',
    });

    if (!response.ok) {
      throw new ApiRequestError(response.status, 'Token refresh failed');
    }

    const data = await response.json();
    const { accessToken: newAccessToken, refreshToken: newRefreshToken } = data;

    tokenStorage.setTokens(newAccessToken, newRefreshToken);

    return { accessToken: newAccessToken, refreshToken: newRefreshToken };
  } catch (error) {
    tokenStorage.clearTokens();
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
    throw error;
  }
}

// === AXIOS INSTANCE ===

const apiClient: AxiosInstance = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// === REQUEST INTERCEPTOR ===
// Inject access token into Authorization header

apiClient.interceptors.request.use(
  (config) => {
    const token = tokenStorage.getAccess();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// === RESPONSE INTERCEPTOR ===
// Handle 401 with auto-refresh and retry logic

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config;

    // Only handle 401 errors
    if (error.response?.status !== 401 || !originalRequest) {
      // Transform other errors to our custom error type
      if (error.response) {
        const errorData = error.response.data as Record<string, unknown>;
        throw new ApiRequestError(
          error.response.status,
          (errorData?.message as string) || error.message,
          (errorData?.path as string) || originalRequest?.url,
        );
      }
      throw error;
    }

    // Prevent infinite retry loops
    if ((originalRequest as any)._retried) {
      tokenStorage.clearTokens();
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
      throw new ApiRequestError(401, 'Authentication failed');
    }

    try {
      // Reuse refresh promise if already in flight
      if (!refreshPromise) {
        refreshPromise = performRefresh();
      }

      const { accessToken } = await refreshPromise;
      refreshPromise = null;

      // Mark request as retried and update token
      (originalRequest as any)._retried = true;
      originalRequest.headers!.Authorization = `Bearer ${accessToken}`;

      // Retry original request
      return apiClient(originalRequest);
    } catch (refreshError) {
      refreshPromise = null;
      throw refreshError;
    }
  },
);

export default apiClient;
