"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  getQueueStatsApi,
  getDlqJobsApi,
  retryDlqJobApi,
  clearDlqApi,
} from "../api/admin-queue.api";
import { handleMutationError } from "@/shared/mutationError";

export function useQueueStats() {
  return useQuery({
    queryKey: ["queueStats"],
    queryFn: getQueueStatsApi,
    refetchInterval: 10_000,
  });
}

export function useDlqJobs(queue?: string) {
  return useQuery({
    queryKey: ["dlqJobs", queue],
    queryFn: () => getDlqJobsApi(queue),
    refetchInterval: 10_000,
  });
}

export function useRetryDlqJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ jobId, queue }: { jobId: string; queue: string }) =>
      retryDlqJobApi(jobId, queue),
    onSuccess: () => {
      toast.success("Job queued for retry.");
      qc.invalidateQueries({ queryKey: ["dlqJobs"] });
      qc.invalidateQueries({ queryKey: ["queueStats"] });
    },
    onError: (err) => handleMutationError(err, "Failed to retry job."),
  });
}

export function useClearDlq() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (queue: string) => clearDlqApi(queue),
    onSuccess: (data) => {
      toast.success(
        `Cleared ${data.removed} failed job${data.removed !== 1 ? "s" : ""}.`,
      );
      qc.invalidateQueries({ queryKey: ["dlqJobs"] });
      qc.invalidateQueries({ queryKey: ["queueStats"] });
    },
    onError: (err) => handleMutationError(err, "Failed to clear queue."),
  });
}
