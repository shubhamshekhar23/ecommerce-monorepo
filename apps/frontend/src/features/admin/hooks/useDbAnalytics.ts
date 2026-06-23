"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  getSlowQueriesApi,
  resetStatsApi,
  getTableStatsApi,
  getReplicationLagApi,
  getReplicationStatusApi,
  getPartitionsApi,
  createNextPartitionApi,
} from "../api/admin-db-analytics.api";
import { handleMutationError } from "@/shared/mutationError";

const INTERVAL = 30_000;

export function useSlowQueries(limit = 10) {
  return useQuery({
    queryKey: ["dbSlowQueries", limit],
    queryFn: () => getSlowQueriesApi(limit),
    refetchInterval: INTERVAL,
  });
}

export function useResetStats() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: resetStatsApi,
    onSuccess: (data) => {
      toast.success(data.message);
      qc.invalidateQueries({ queryKey: ["dbSlowQueries"] });
    },
    onError: (err) => handleMutationError(err, "Failed to reset stats."),
  });
}

export function useTableStats() {
  return useQuery({
    queryKey: ["dbTableStats"],
    queryFn: getTableStatsApi,
    refetchInterval: INTERVAL,
  });
}

export function useReplicationLag() {
  return useQuery({
    queryKey: ["dbReplicationLag"],
    queryFn: getReplicationLagApi,
    refetchInterval: INTERVAL,
  });
}

export function useReplicationStatus() {
  return useQuery({
    queryKey: ["dbReplicationStatus"],
    queryFn: getReplicationStatusApi,
    refetchInterval: INTERVAL,
  });
}

export function usePartitions() {
  return useQuery({
    queryKey: ["dbPartitions"],
    queryFn: getPartitionsApi,
    refetchInterval: INTERVAL,
  });
}

export function useCreateNextPartition() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createNextPartitionApi,
    onSuccess: (data) => {
      toast.success(data.message);
      qc.invalidateQueries({ queryKey: ["dbPartitions"] });
    },
    onError: (err) => handleMutationError(err, "Failed to create partition."),
  });
}
