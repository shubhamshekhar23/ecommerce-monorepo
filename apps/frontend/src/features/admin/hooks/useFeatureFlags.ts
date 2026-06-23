"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  getFeatureFlagsApi,
  createFeatureFlagApi,
  updateFeatureFlagApi,
  deleteFeatureFlagApi,
  type CreateFeatureFlagPayload,
  type UpdateFeatureFlagPayload,
} from "../api/admin-feature-flags.api";
import { handleMutationError } from "@/shared/mutationError";

const FLAGS_KEY = ["featureFlags"];

export function useFeatureFlags() {
  return useQuery({
    queryKey: FLAGS_KEY,
    queryFn: getFeatureFlagsApi,
  });
}

export function useCreateFeatureFlag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateFeatureFlagPayload) =>
      createFeatureFlagApi(payload),
    onSuccess: () => {
      toast.success("Feature flag created.");
      qc.invalidateQueries({ queryKey: FLAGS_KEY });
    },
    onError: (err) => handleMutationError(err, "Failed to create flag."),
  });
}

export function useUpdateFeatureFlag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      name,
      payload,
    }: {
      name: string;
      payload: UpdateFeatureFlagPayload;
    }) => updateFeatureFlagApi(name, payload),
    onSuccess: () => {
      toast.success("Flag updated.");
      qc.invalidateQueries({ queryKey: FLAGS_KEY });
    },
    onError: (err) => handleMutationError(err, "Failed to update flag."),
  });
}

export function useDeleteFeatureFlag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteFeatureFlagApi,
    onSuccess: () => {
      toast.success("Feature flag deleted.");
      qc.invalidateQueries({ queryKey: FLAGS_KEY });
    },
    onError: (err) => handleMutationError(err, "Failed to delete flag."),
  });
}
