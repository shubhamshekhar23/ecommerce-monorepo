import apiClient from "@/shared/apiClient";

export interface FeatureFlag {
  name: string;
  enabled: boolean;
  rolloutPercentage: number;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateFeatureFlagPayload {
  name: string;
  enabled?: boolean;
  rolloutPercentage?: number;
  description?: string;
}

export type UpdateFeatureFlagPayload = Partial<
  Omit<CreateFeatureFlagPayload, "name">
>;

export async function getFeatureFlagsApi(): Promise<FeatureFlag[]> {
  const res = await apiClient.get<FeatureFlag[]>("/admin/feature-flags");
  return res.data;
}

export async function createFeatureFlagApi(
  payload: CreateFeatureFlagPayload,
): Promise<FeatureFlag> {
  const res = await apiClient.post<FeatureFlag>(
    "/admin/feature-flags",
    payload,
  );
  return res.data;
}

export async function updateFeatureFlagApi(
  name: string,
  payload: UpdateFeatureFlagPayload,
): Promise<FeatureFlag> {
  const res = await apiClient.patch<FeatureFlag>(
    `/admin/feature-flags/${name}`,
    payload,
  );
  return res.data;
}

export async function deleteFeatureFlagApi(name: string): Promise<void> {
  await apiClient.delete(`/admin/feature-flags/${name}`);
}
