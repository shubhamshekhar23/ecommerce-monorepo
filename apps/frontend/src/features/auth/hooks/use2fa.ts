"use client";

import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import apiClient from "@/shared/apiClient";
import { handleMutationError } from "@/shared/mutationError";

interface Setup2faResponse {
  uri: string;
  secret: string;
}

export function use2faSetup() {
  return useMutation({
    mutationFn: async (): Promise<Setup2faResponse> => {
      const res = await apiClient.post<Setup2faResponse>("/auth/2fa/setup");
      return res.data;
    },
    onError: (err) => handleMutationError(err, "Failed to set up 2FA."),
  });
}

export function use2faEnable() {
  return useMutation({
    mutationFn: async (code: string): Promise<void> => {
      await apiClient.post("/auth/2fa/enable", { code });
    },
    onSuccess: () => toast.success("Two-factor authentication enabled."),
    onError: (err) =>
      handleMutationError(err, "Invalid code. Please try again."),
  });
}

export function use2faVerify() {
  return useMutation({
    mutationFn: async ({
      code,
      twoFactorToken,
    }: {
      code: string;
      twoFactorToken: string;
    }): Promise<{ accessToken: string; refreshToken: string }> => {
      const res = await apiClient.post<{
        accessToken: string;
        refreshToken: string;
      }>("/auth/2fa/verify", { code, twoFactorToken });
      return res.data;
    },
    onError: (err) =>
      handleMutationError(err, "Invalid code. Please try again."),
  });
}

export function use2faDisable() {
  return useMutation({
    mutationFn: async (code: string): Promise<void> => {
      await apiClient.post("/auth/2fa/disable", { code });
    },
    onSuccess: () => toast.success("Two-factor authentication disabled."),
    onError: (err) =>
      handleMutationError(err, "Invalid code. Please try again."),
  });
}
