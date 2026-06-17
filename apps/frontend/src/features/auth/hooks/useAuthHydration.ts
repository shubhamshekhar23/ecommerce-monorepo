// src/features/auth/hooks/useAuthHydration.ts
// Hydrate auth state from stored tokens on app load

"use client";

import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { getMeApi } from "../api/auth.api";
import { useAuthStore } from "@/store/auth.store";
import { tokenStorage, silentRefresh } from "@/shared/apiClient";
import { getTokenExpiry } from "../utils/token.utils";

export function useAuthHydration(): void {
  const setAuth = useAuthStore((state) => state.setAuth);
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const setStatus = useAuthStore((state) => state.setStatus);
  const router = useRouter();
  const queryClient = useQueryClient();

  const hasToken =
    typeof window !== "undefined" && tokenStorage.getAccess() !== null;

  const { data, isError, isLoading } = useQuery({
    queryKey: ["auth", "me"],
    queryFn: getMeApi,
    enabled: hasToken,
    staleTime: Infinity,
    retry: false,
  });

  useEffect(() => {
    if (isLoading) setStatus("loading");
  }, [isLoading, setStatus]);

  useEffect(() => {
    if (data) {
      const access = tokenStorage.getAccess();
      const refresh = tokenStorage.getRefresh();
      if (access && refresh) setAuth(data, access, refresh);
    }
  }, [data, setAuth]);

  useEffect(() => {
    if (isError && hasToken) clearAuth();
  }, [isError, hasToken, clearAuth]);

  useEffect(() => {
    if (!hasToken && !isLoading) setStatus("unauthenticated");
  }, [hasToken, isLoading, setStatus]);

  // Proactive silent refresh: schedule 3 minutes before the access token expires so
  // the user never hits a 401 mid-flow (e.g. during checkout on a slow connection).
  useEffect(() => {
    if (!data) return;
    const token = tokenStorage.getAccess();
    if (!token) return;

    const expiry = getTokenExpiry(token);
    if (!expiry) return;

    const delay = expiry - Date.now() - 3 * 60 * 1000;
    if (delay <= 0) return; // already too close — let the interceptor handle it

    const id = window.setTimeout(async () => {
      try {
        const { accessToken, refreshToken: newRefresh } = await silentRefresh();
        setAuth(data, accessToken, newRefresh);
      } catch {
        // silentRefresh already redirects to /login?session_expired=1 on failure
      }
    }, delay);

    return () => window.clearTimeout(id);
  }, [data, setAuth]);

  // Multi-tab sync: the storage event fires in every tab EXCEPT the one that wrote.
  // This means a logout in tab A automatically logs out tabs B and C without a reload.
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === "auth-logout") {
        clearAuth();
        router.push("/login");
      }
      if (event.key === "auth-login") {
        // Re-hydrate so this tab picks up the session without a full reload.
        queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
      }
    };

    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [clearAuth, router, queryClient]);
}
