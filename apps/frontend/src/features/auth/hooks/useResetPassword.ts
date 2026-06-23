"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import apiClient from "@/shared/apiClient";
import { handleMutationError } from "@/shared/mutationError";
import { toast } from "sonner";

interface ResetPasswordPayload {
  token: string;
  newPassword: string;
}

async function resetPasswordApi(payload: ResetPasswordPayload): Promise<void> {
  await apiClient.post("/auth/reset-password", payload);
}

export function useResetPassword() {
  const router = useRouter();
  return useMutation({
    mutationFn: resetPasswordApi,
    onSuccess: () => {
      toast.success("Password reset. Please sign in.");
      router.push("/login");
    },
    onError: (err) => handleMutationError(err, "Failed to reset password."),
  });
}
