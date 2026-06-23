"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createReturnApi } from "../api/returns.api";
import { handleMutationError } from "@/shared/mutationError";
import type { CreateReturnPayload } from "../interfaces";

export function useCreateReturn() {
  const qc = useQueryClient();
  const router = useRouter();
  return useMutation({
    mutationFn: (payload: CreateReturnPayload) => createReturnApi(payload),
    onSuccess: (ret) => {
      toast.success("Return request submitted.");
      qc.invalidateQueries({ queryKey: ["order", ret.orderId] });
      router.push(`/orders/${ret.orderId}`);
    },
    onError: (err) =>
      handleMutationError(err, "Failed to submit return request."),
  });
}
