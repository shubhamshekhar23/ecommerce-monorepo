// src/features/auth/hooks/useLogin.ts
// Login mutation hook

"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { loginApi, getMeApi } from "../api/auth.api";
import { useAuthStore } from "@/store/auth.store";
import { logger } from "@/shared/logger";
import { handleMutationError } from "@/shared/mutationError";
import type { LoginPayload } from "../interfaces";

export function useLogin() {
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (payload: LoginPayload) => loginApi(payload),
    onSuccess: async (data) => {
      // Seed store with partial user so the token is available for the /users/me call.
      setAuth(data.user, data.accessToken, data.refreshToken);

      // The login response omits role and other profile fields. Fetch the full
      // profile immediately so the store has role before the redirect renders.
      try {
        const fullUser = await getMeApi();
        setAuth(fullUser, data.accessToken, data.refreshToken);
        queryClient.setQueryData(["auth", "me"], fullUser);
      } catch {
        // Non-fatal — user is still logged in, role just may not show until hydration.
      }

      logger.setUser({ id: data.user.id, email: data.user.email });

      // Broadcast to other tabs that a login occurred so they pick up the session.
      localStorage.setItem("auth-login", Date.now().toString());
      localStorage.removeItem("auth-login");

      // Honor the callbackUrl middleware set when redirecting unauthenticated users.
      const callbackUrl =
        new URLSearchParams(window.location.search).get("callbackUrl") ?? "/";
      router.push(callbackUrl);
    },
    onError: (err, vars) => {
      handleMutationError(err, "Login failed", () => mutation.mutate(vars));
    },
  });
  return mutation;
}
