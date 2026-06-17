// src/shared/apiClient.ts
// Axios client with JWT interceptors and auto-refresh on 401.
// All errors are normalised to AppError before they reach hooks or components.

import axios, { AxiosError, AxiosInstance } from "axios";
import { API_URL } from "./config";
import { AppError, type ErrorCategory } from "./errors";

// === TOKEN STORAGE ===

export const tokenStorage = {
  getAccess(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("accessToken");
  },

  getRefresh(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("refreshToken");
  },

  setTokens(accessToken: string, refreshToken: string): void {
    if (typeof window === "undefined") return;
    localStorage.setItem("accessToken", accessToken);
    localStorage.setItem("refreshToken", refreshToken);
  },

  clearTokens(): void {
    if (typeof window === "undefined") return;
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
  },
};

// === ERROR NORMALISATION ===

function normaliseError(status: number, serverMessage?: string): AppError {
  let category: ErrorCategory;
  let userMessage: string;

  if (status === 422) {
    category = "validation";
    userMessage = serverMessage ?? "Please check your input and try again.";
  } else if (status === 401 || status === 403) {
    category = "auth";
    userMessage = "Session expired. Please sign in again.";
  } else if (status >= 400 && status < 500) {
    category = "business";
    userMessage = serverMessage ?? "Request failed. Please try again.";
  } else if (status >= 500) {
    category = "server";
    userMessage = "Something went wrong on our end. Please try again.";
  } else {
    category = "unknown";
    userMessage = "An unexpected error occurred.";
  }

  return new AppError(category, userMessage, status);
}

// === REFRESH QUEUE ===
// Prevents concurrent refresh calls when multiple 401s occur simultaneously.

let refreshPromise: Promise<{
  accessToken: string;
  refreshToken: string;
}> | null = null;

async function performRefresh(): Promise<{
  accessToken: string;
  refreshToken: string;
}> {
  const refreshToken = tokenStorage.getRefresh();
  if (!refreshToken) {
    throw new AppError("auth", "Session expired. Please sign in again.", 401);
  }

  try {
    const response = await fetch(`${API_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
      credentials: "include",
    });

    if (!response.ok) {
      throw new AppError(
        "auth",
        "Session expired. Please sign in again.",
        response.status,
      );
    }

    const data = await response.json();
    const { accessToken: newAccessToken, refreshToken: newRefreshToken } = data;

    tokenStorage.setTokens(newAccessToken, newRefreshToken);

    return { accessToken: newAccessToken, refreshToken: newRefreshToken };
  } catch (error) {
    tokenStorage.clearTokens();
    if (typeof window !== "undefined") {
      window.location.href = "/login?session_expired=1";
    }
    throw error;
  }
}

// Exported for proactive silent refresh from useAuthHydration.
// Wraps performRefresh so the calling hook doesn't need to import the private function.
export async function silentRefresh(): Promise<{
  accessToken: string;
  refreshToken: string;
}> {
  return performRefresh();
}

// === AXIOS INSTANCE ===

const apiClient: AxiosInstance = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  timeout: 10_000, // 10 s — a hanging request keeps the UI stuck indefinitely without this
  headers: {
    "Content-Type": "application/json",
  },
});

// === REQUEST INTERCEPTOR ===

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

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config;

    // No HTTP response — network error or timeout
    if (!error.response) {
      throw new AppError("network", "Check your connection and try again.");
    }

    const { status, data } = error.response;
    const serverMessage = (data as Record<string, unknown>)?.message as
      | string
      | undefined;

    // 401 → attempt token refresh, then retry
    if (status === 401 && originalRequest) {
      const req = originalRequest as unknown as Record<string, unknown>;
      if (req._retried) {
        tokenStorage.clearTokens();
        if (typeof window !== "undefined") {
          window.location.href = "/login?session_expired=1";
        }
        throw new AppError(
          "auth",
          "Session expired. Please sign in again.",
          401,
        );
      }

      try {
        if (!refreshPromise) {
          refreshPromise = performRefresh();
        }

        const { accessToken } = await refreshPromise;
        refreshPromise = null;

        req._retried = true;
        originalRequest.headers!.Authorization = `Bearer ${accessToken}`;

        return apiClient(originalRequest);
      } catch (refreshError) {
        refreshPromise = null;
        throw refreshError;
      }
    }

    // All other HTTP errors → normalise to AppError
    throw normaliseError(status, serverMessage);
  },
);

export default apiClient;
