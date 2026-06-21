// src/features/admin/hooks/useDeleteCategory.ts

"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { deleteCategoryApi } from "../api/admin-categories.api";
import { handleMutationError } from "@/shared/mutationError";

export function useDeleteCategory() {
  const queryClient = useQueryClient();

  const mutation = useMutation<void, Error, string>({
    mutationFn: (id: string) => deleteCategoryApi(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "categories"] });
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      toast.success("Category deleted");
    },
    onError: (err, vars) => {
      handleMutationError(err, "Failed to delete category", () =>
        mutation.mutate(vars),
      );
    },
  });
  return mutation;
}
