import apiClient from "@/shared/apiClient";

export interface PromotionRule {
  id: string;
  name: string;
  description?: string;
  condition: Record<string, unknown>;
  conditionDsl?: string;
  action: Record<string, unknown>;
  priority: number;
  stackable: boolean;
  active: boolean;
  startsAt?: string;
  expiresAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePromotionRulePayload {
  name: string;
  description?: string;
  condition: Record<string, unknown>;
  conditionDsl?: string;
  action: Record<string, unknown>;
  priority?: number;
  stackable?: boolean;
}

export type UpdatePromotionRulePayload = Partial<
  CreatePromotionRulePayload & { active: boolean }
>;

export async function getPromotionRulesApi(): Promise<PromotionRule[]> {
  const res = await apiClient.get<PromotionRule[]>("/admin/promotion-rules");
  return res.data;
}

export async function createPromotionRuleApi(
  payload: CreatePromotionRulePayload,
): Promise<PromotionRule> {
  const res = await apiClient.post<PromotionRule>(
    "/admin/promotion-rules",
    payload,
  );
  return res.data;
}

export async function updatePromotionRuleApi(
  id: string,
  payload: UpdatePromotionRulePayload,
): Promise<PromotionRule> {
  const res = await apiClient.patch<PromotionRule>(
    `/admin/promotion-rules/${id}`,
    payload,
  );
  return res.data;
}

export async function deletePromotionRuleApi(id: string): Promise<void> {
  await apiClient.delete(`/admin/promotion-rules/${id}`);
}
