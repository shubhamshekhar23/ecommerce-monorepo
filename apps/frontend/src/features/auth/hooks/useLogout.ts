// src/features/auth/hooks/useLogout.ts
// Logout mutation hook

"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { logoutApi } from "../api/auth.api";
import { useAuthStore } from "@/store/auth.store";
import { tokenStorage } from "@/shared/apiClient";
import { logger } from "@/shared/logger";

export function useLogout() {
  const router = useRouter();
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const refreshToken = tokenStorage.getRefresh();
      if (refreshToken) {
        await logoutApi(refreshToken);
      }
    },
    onSettled: () => {
      clearAuth();
      logger.setUser(null);
      queryClient.clear();
      router.push("/login");
    },
  });
}
