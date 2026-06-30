// src/features/auth/api/auth.api.ts

import apiClient from "@/shared/apiClient";
import { logger } from "@/shared/logger";
import type {
  LoginPayload,
  RegisterPayload,
  AuthResponse,
  LoginResponse,
} from "../interfaces";
import type { User } from "@/store/auth.store";

export async function loginApi(payload: LoginPayload): Promise<LoginResponse> {
  const response = await apiClient.post<LoginResponse>("/auth/login", payload);
  return response.data;
}

export async function registerApi(
  payload: RegisterPayload,
): Promise<AuthResponse> {
  const response = await apiClient.post<AuthResponse>(
    "/auth/register",
    payload,
  );
  return response.data;
}

export async function logoutApi(refreshToken: string): Promise<void> {
  try {
    await apiClient.post("/auth/logout", { refreshToken });
  } catch (error) {
    // Don't throw — logout must succeed locally even if the API call fails.
    logger.warn("Logout API call failed (local session cleared regardless)", {
      error,
    });
  }
}

export async function getMeApi(): Promise<User> {
  const response = await apiClient.get<User>("/users/me");
  return response.data;
}
