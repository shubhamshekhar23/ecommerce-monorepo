// src/features/auth/hooks/useLogin.ts
// Login mutation hook

"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { loginApi } from "../api/auth.api";
import { useAuthStore } from "@/store/auth.store";
import { logger } from "@/shared/logger";
import type { LoginPayload } from "../interfaces";

export function useLogin() {
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);

  return useMutation({
    mutationFn: (payload: LoginPayload) => loginApi(payload),
    onSuccess: (data) => {
      setAuth(data.user, data.accessToken, data.refreshToken);
      logger.setUser({ id: data.user.id, email: data.user.email });

      // Broadcast to other tabs that a login occurred so they pick up the session.
      localStorage.setItem("auth-login", Date.now().toString());
      localStorage.removeItem("auth-login");

      // Honor the callbackUrl middleware set when redirecting unauthenticated users.
      const callbackUrl =
        new URLSearchParams(window.location.search).get("callbackUrl") ?? "/";
      router.push(callbackUrl);
    },
  });
}
