"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  getArchivedProductsApi,
  restoreProductApi,
  purgeProductApi,
} from "../api/admin-products.api";
import { handleMutationError } from "@/shared/mutationError";

export function useArchivedProducts() {
  return useQuery({
    queryKey: ["archivedProducts"],
    queryFn: getArchivedProductsApi,
  });
}

export function useRestoreProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: restoreProductApi,
    onSuccess: () => {
      toast.success("Product restored.");
      qc.invalidateQueries({ queryKey: ["archivedProducts"] });
      qc.invalidateQueries({ queryKey: ["adminProducts"] });
    },
    onError: (err) => handleMutationError(err, "Failed to restore product."),
  });
}

export function usePurgeProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: purgeProductApi,
    onSuccess: () => {
      toast.success("Product permanently deleted.");
      qc.invalidateQueries({ queryKey: ["archivedProducts"] });
    },
    onError: (err) => handleMutationError(err, "Failed to purge product."),
  });
}
