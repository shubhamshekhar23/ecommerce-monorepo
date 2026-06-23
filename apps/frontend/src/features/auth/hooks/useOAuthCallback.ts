"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuthStore } from "@/store/auth.store";
import { tokenStorage } from "@/shared/apiClient";
import apiClient from "@/shared/apiClient";
import type { User } from "@/store/auth.store";

export function useOAuthCallback() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setAuth = useAuthStore((s) => s.setAuth);

  useEffect(() => {
    const accessToken = searchParams.get("accessToken");
    const refreshToken = searchParams.get("refreshToken");

    if (!accessToken || !refreshToken) {
      router.replace("/login?error=oauth_failed");
      return;
    }

    tokenStorage.setTokens(accessToken, refreshToken);

    apiClient
      .get<User>("/users/me")
      .then((res) => {
        setAuth(res.data, accessToken, refreshToken);
        const callbackUrl = searchParams.get("callbackUrl") ?? "/";
        router.replace(callbackUrl);
      })
      .catch(() => {
        router.replace("/login?error=oauth_failed");
      });
  }, [searchParams, router, setAuth]);
}
