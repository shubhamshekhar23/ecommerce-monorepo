import apiClient from "@/shared/apiClient";

export interface SlowQuery {
  query: string;
  calls: number;
  meanExecMs: number;
  totalExecMs: number;
  rows: number;
  stddevExecMs: number;
}

export interface TableStat {
  tableName: string;
  liveTuples: number;
  deadTuples: number;
  deadTuplePercent: number;
  totalSize: string;
  modsSinceAnalyze: number;
  lastAutovacuum: string | null;
  lastAutoanalyze: string | null;
}

export interface ReplicationLag {
  replicaConnected: boolean;
  lagSeconds: number | null;
  lagDescription: string | null;
}

export interface ReplicationStatus {
  client_addr: string;
  state: string;
  sent_lsn: string;
  replay_lsn: string;
  lag_bytes: number;
}

export interface PartitionInfo {
  partitionName: string;
  fromValue: string;
  toValue: string;
  estimatedSize: string;
}

export async function getSlowQueriesApi(limit = 10): Promise<SlowQuery[]> {
  const res = await apiClient.get<SlowQuery[]>("/admin/db/slow-queries", {
    params: { limit },
  });
  return res.data;
}

export async function resetStatsApi(): Promise<{ message: string }> {
  const res = await apiClient.post<{ message: string }>(
    "/admin/db/reset-stats",
  );
  return res.data;
}

export async function getTableStatsApi(): Promise<TableStat[]> {
  const res = await apiClient.get<TableStat[]>("/admin/db/table-stats");
  return res.data;
}

export async function getReplicationLagApi(): Promise<ReplicationLag> {
  const res = await apiClient.get<ReplicationLag>("/admin/db/replication/lag");
  return res.data;
}

export async function getReplicationStatusApi(): Promise<ReplicationStatus[]> {
  const res = await apiClient.get<ReplicationStatus[]>(
    "/admin/db/replication/status",
  );
  return res.data;
}

export async function getPartitionsApi(): Promise<PartitionInfo[]> {
  const res = await apiClient.get<PartitionInfo[]>("/admin/db/partitions");
  return res.data;
}

export async function createNextPartitionApi(): Promise<{ message: string }> {
  const res = await apiClient.post<{ message: string }>(
    "/admin/db/partitions/create-next",
  );
  return res.data;
}
