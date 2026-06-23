"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  updateProfileApi,
  type UpdateProfilePayload,
} from "../api/account.api";
import { useAuthStore } from "@/store/auth.store";
import { handleMutationError } from "@/shared/mutationError";

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  const setAuth = useAuthStore((s) => s.setAuth);
  const accessToken = useAuthStore((s) => s.accessToken);
  const user = useAuthStore((s) => s.user);

  return useMutation({
    mutationFn: (payload: UpdateProfilePayload) => updateProfileApi(payload),
    onSuccess: (updated) => {
      queryClient.setQueryData(["me"], updated);
      if (accessToken && user) {
        const refreshToken =
          typeof window !== "undefined"
            ? (localStorage.getItem("refreshToken") ?? "")
            : "";
        setAuth(updated, accessToken, refreshToken);
      }
      toast.success("Profile updated.");
    },
    onError: (err) => handleMutationError(err, "Failed to update profile."),
  });
}
