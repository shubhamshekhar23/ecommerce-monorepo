import apiClient from "@/shared/apiClient";

export type QueueStatsMap = Record<string, Record<string, number>>;

export interface DlqJob {
  id: string;
  name: string;
  data: unknown;
  failedReason: string;
  attemptsMade: number;
  timestamp: number;
}

export async function getQueueStatsApi(): Promise<QueueStatsMap> {
  const res = await apiClient.get<QueueStatsMap>("/admin/queue/stats");
  return res.data;
}

export async function getDlqJobsApi(queue?: string): Promise<DlqJob[]> {
  const res = await apiClient.get<{ jobs: DlqJob[] }>("/admin/queue/dlq", {
    params: queue ? { queue } : {},
  });
  return res.data.jobs;
}

export async function retryDlqJobApi(
  jobId: string,
  queue: string,
): Promise<{ success: boolean }> {
  const res = await apiClient.post<{ success: boolean }>(
    `/admin/queue/dlq/${jobId}/retry`,
    null,
    { params: { queue } },
  );
  return res.data;
}

export async function clearDlqApi(queue: string): Promise<{ removed: number }> {
  const res = await apiClient.post<{ removed: number }>(
    "/admin/queue/dlq/clear",
    null,
    { params: { queue } },
  );
  return res.data;
}
