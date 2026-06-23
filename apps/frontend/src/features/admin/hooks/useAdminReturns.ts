"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  getAdminReturnsApi,
  approveReturnApi,
  rejectReturnApi,
  refundReturnApi,
} from "../api/admin-returns.api";
import { handleMutationError } from "@/shared/mutationError";

const RETURNS_KEY = ["adminReturns"];

export function useAdminReturns() {
  return useQuery({
    queryKey: RETURNS_KEY,
    queryFn: getAdminReturnsApi,
  });
}

export function useApproveReturn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: approveReturnApi,
    onSuccess: () => {
      toast.success("Return approved.");
      qc.invalidateQueries({ queryKey: RETURNS_KEY });
    },
    onError: (err) => handleMutationError(err, "Failed to approve return."),
  });
}

export function useRejectReturn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      rejectReturnApi(id, reason),
    onSuccess: () => {
      toast.success("Return rejected.");
      qc.invalidateQueries({ queryKey: RETURNS_KEY });
    },
    onError: (err) => handleMutationError(err, "Failed to reject return."),
  });
}

export function useRefundReturn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: refundReturnApi,
    onSuccess: () => {
      toast.success("Refund processed and inventory restocked.");
      qc.invalidateQueries({ queryKey: RETURNS_KEY });
    },
    onError: (err) => handleMutationError(err, "Failed to process refund."),
  });
}
