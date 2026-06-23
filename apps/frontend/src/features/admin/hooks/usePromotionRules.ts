"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  getPromotionRulesApi,
  createPromotionRuleApi,
  updatePromotionRuleApi,
  deletePromotionRuleApi,
  type CreatePromotionRulePayload,
  type UpdatePromotionRulePayload,
} from "../api/admin-promotions.api";
import { handleMutationError } from "@/shared/mutationError";

const RULES_KEY = ["promotionRules"];

export function usePromotionRules() {
  return useQuery({
    queryKey: RULES_KEY,
    queryFn: getPromotionRulesApi,
  });
}

export function useCreatePromotionRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreatePromotionRulePayload) =>
      createPromotionRuleApi(payload),
    onSuccess: () => {
      toast.success("Promotion rule created.");
      qc.invalidateQueries({ queryKey: RULES_KEY });
    },
    onError: (err) => handleMutationError(err, "Failed to create rule."),
  });
}

export function useUpdatePromotionRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: UpdatePromotionRulePayload;
    }) => updatePromotionRuleApi(id, payload),
    onSuccess: () => {
      toast.success("Promotion rule updated.");
      qc.invalidateQueries({ queryKey: RULES_KEY });
    },
    onError: (err) => handleMutationError(err, "Failed to update rule."),
  });
}

export function useDeletePromotionRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deletePromotionRuleApi,
    onSuccess: () => {
      toast.success("Promotion rule deactivated.");
      qc.invalidateQueries({ queryKey: RULES_KEY });
    },
    onError: (err) => handleMutationError(err, "Failed to deactivate rule."),
  });
}
