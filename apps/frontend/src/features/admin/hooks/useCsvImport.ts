"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { importProductsCsvApi } from "../api/admin-products.api";
import { handleMutationError } from "@/shared/mutationError";

export function useCsvImport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: importProductsCsvApi,
    onSuccess: (result) => {
      toast.success(
        `Imported ${result.imported} product${result.imported !== 1 ? "s" : ""}.`,
      );
      if (result.failed > 0) {
        toast.error(
          `${result.failed} row${result.failed !== 1 ? "s" : ""} failed to import.`,
        );
      }
      qc.invalidateQueries({ queryKey: ["adminProducts"] });
    },
    onError: (err) => handleMutationError(err, "CSV import failed."),
  });
}
