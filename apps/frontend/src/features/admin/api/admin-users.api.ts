// src/features/admin/api/admin-users.api.ts

"use client";

import apiClient from "@/shared/apiClient";
import type { User } from "@/store/auth.store";

export async function getAllUsersApi(): Promise<User[]> {
  const response = await apiClient.get<User[]>("/users");
  return response.data;
}
