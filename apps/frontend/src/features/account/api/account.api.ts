import apiClient from "@/shared/apiClient";
import type { User } from "@/store/auth.store";

export interface UpdateProfilePayload {
  firstName?: string;
  lastName?: string;
  email?: string;
}

export async function getMeApi(): Promise<User> {
  const response = await apiClient.get<User>("/users/me");
  return response.data;
}

export async function updateProfileApi(
  payload: UpdateProfilePayload,
): Promise<User> {
  const response = await apiClient.patch<User>("/users/me", payload);
  return response.data;
}

export async function requestDataDeletionApi(): Promise<void> {
  await apiClient.delete("/users/me/data");
}

export async function cancelDataDeletionApi(): Promise<void> {
  await apiClient.delete("/users/me/data/cancel");
}
