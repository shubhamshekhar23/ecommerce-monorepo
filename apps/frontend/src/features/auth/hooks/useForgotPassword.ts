"use client";

import { useMutation } from "@tanstack/react-query";
import apiClient from "@/shared/apiClient";
import { handleMutationError } from "@/shared/mutationError";

async function forgotPasswordApi(email: string): Promise<void> {
  await apiClient.post("/auth/forgot-password", { email });
}

export function useForgotPassword() {
  return useMutation({
    mutationFn: forgotPasswordApi,
    onError: (err) =>
      handleMutationError(err, "Request failed. Please try again."),
  });
}
