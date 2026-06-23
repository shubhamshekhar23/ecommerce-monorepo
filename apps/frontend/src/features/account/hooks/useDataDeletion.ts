"use client";

import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  requestDataDeletionApi,
  cancelDataDeletionApi,
} from "../api/account.api";
import { handleMutationError } from "@/shared/mutationError";

export function useRequestDataDeletion() {
  return useMutation({
    mutationFn: requestDataDeletionApi,
    onSuccess: () =>
      toast.success("Data deletion scheduled. You have 30 days to cancel."),
    onError: (err) =>
      handleMutationError(err, "Failed to schedule data deletion."),
  });
}

export function useCancelDataDeletion() {
  return useMutation({
    mutationFn: cancelDataDeletionApi,
    onSuccess: () => toast.success("Data deletion cancelled."),
    onError: (err) =>
      handleMutationError(err, "Failed to cancel data deletion."),
  });
}
