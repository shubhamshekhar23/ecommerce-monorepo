"use client";

import {
  useSlowQueries,
  useResetStats,
  useTableStats,
  useReplicationLag,
  useReplicationStatus,
  usePartitions,
  useCreateNextPartition,
} from "@/features/admin";
import { AdminTableSkeleton } from "@/features/admin";
import styles from "./page.module.scss";

function lagColorClass(lagBytes: number): string {
  if (lagBytes < 10 * 1024 * 1024) return styles.lagGreen;
  if (lagBytes < 100 * 1024 * 1024) return styles.lagAmber;
  return styles.lagRed;
}

export default function DbAnalyticsPage() {
  const {
    data: slowQueries,
    isLoading: loadingSQ,
    dataUpdatedAt,
  } = useSlowQueries(10);
  const { mutate: resetStats, isPending: isResetting } = useResetStats();
  const { data: tableStats, isLoading: loadingTS } = useTableStats();
  const { data: repLag, isLoading: loadingRL } = useReplicationLag();
  const { data: repStatus, isLoading: loadingRS } = useReplicationStatus();
  const { data: partitions, isLoading: loadingP } = usePartitions();
  const { mutate: createNextPartition, isPending: isCreatingPartition } =
    useCreateNextPartition();

  const lastRefreshed = dataUpdatedAt
    ? new Date(dataUpdatedAt).toLocaleTimeString()
    : "—";

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>DB Analytics</h1>
        <span className={styles.refreshLabel}>
          Auto-refreshes every 30s · Last: {lastRefreshed}
        </span>
      </div>

      {/* Slow Queries */}
      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <h2 className={styles.sectionTitle}>Slow Queries</h2>
          <button
            className={styles.actionBtn}
            onClick={() => resetStats()}
            disabled={isResetting}
          >
            {isResetting ? "Resetting…" : "Reset stats"}
          </button>
        </div>
        {loadingSQ && <AdminTableSkeleton rows={5} columns={5} />}
        {!loadingSQ && !slowQueries?.length && (
          <p className={styles.empty}>
            No query stats yet. pg_stat_statements may not be enabled.
          </p>
        )}
        {!loadingSQ && !!slowQueries?.length && (
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Query</th>
                  <th>Calls</th>
                  <th>Mean (ms)</th>
                  <th>Total (ms)</th>
                  <th>Rows</th>
                  <th>Stddev (ms)</th>
                </tr>
              </thead>
              <tbody>
                {slowQueries.map((sq, i) => (
                  <tr key={i}>
                    <td className={styles.queryText}>{sq.query}</td>
                    <td>{sq.calls.toLocaleString()}</td>
                    <td>{sq.meanExecMs.toFixed(2)}</td>
                    <td className={styles.totalMs}>
                      {sq.totalExecMs.toFixed(0)}
                    </td>
                    <td>{sq.rows.toLocaleString()}</td>
                    <td>{sq.stddevExecMs.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Table Stats */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Table Stats</h2>
        {loadingTS && <AdminTableSkeleton rows={5} columns={6} />}
        {!loadingTS && !!tableStats?.length && (
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Table</th>
                  <th>Live Tuples</th>
                  <th>Dead Tuples</th>
                  <th>Dead %</th>
                  <th>Total Size</th>
                  <th>Last Autovacuum</th>
                </tr>
              </thead>
              <tbody>
                {tableStats.map((ts) => (
                  <tr key={ts.tableName}>
                    <td className={styles.tableName}>{ts.tableName}</td>
                    <td>{ts.liveTuples.toLocaleString()}</td>
                    <td>{ts.deadTuples.toLocaleString()}</td>
                    <td
                      className={
                        ts.deadTuplePercent > 20
                          ? styles.warnPercent
                          : undefined
                      }
                    >
                      {ts.deadTuplePercent.toFixed(1)}%
                    </td>
                    <td>{ts.totalSize}</td>
                    <td className={styles.dateCell}>
                      {ts.lastAutovacuum
                        ? new Date(ts.lastAutovacuum).toLocaleString()
                        : "Never"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!loadingTS && !tableStats?.length && (
          <p className={styles.empty}>No table statistics available.</p>
        )}
      </section>

      {/* Replication */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Replication</h2>
        {loadingRL || loadingRS ? (
          <AdminTableSkeleton rows={2} columns={3} />
        ) : (
          <div className={styles.repGrid}>
            <div className={styles.repCard}>
              <p className={styles.repCardLabel}>Replica Lag</p>
              {repLag ? (
                repLag.replicaConnected ? (
                  <>
                    <p className={styles.lagValue}>
                      {repLag.lagDescription ?? `${repLag.lagSeconds}s`}
                    </p>
                    <p className={styles.repCardSub}>Replica connected</p>
                  </>
                ) : (
                  <p className={styles.repNotConnected}>
                    Replica not configured
                  </p>
                )
              ) : (
                <p className={styles.empty}>—</p>
              )}
            </div>

            <div className={styles.repCard}>
              <p className={styles.repCardLabel}>Primary Replication Status</p>
              {!repStatus?.length && (
                <p className={styles.repNotConnected}>No replicas connected</p>
              )}
              {!!repStatus?.length && (
                <table className={styles.repTable}>
                  <thead>
                    <tr>
                      <th>Client</th>
                      <th>State</th>
                      <th>Lag (bytes)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {repStatus.map((r, i) => (
                      <tr key={i}>
                        <td>{r.client_addr}</td>
                        <td>{r.state}</td>
                        <td className={lagColorClass(r.lag_bytes)}>
                          {r.lag_bytes.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
      </section>

      {/* Partitions */}
      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <h2 className={styles.sectionTitle}>RequestMetric Partitions</h2>
          <button
            className={styles.actionBtn}
            onClick={() => createNextPartition()}
            disabled={isCreatingPartition}
          >
            {isCreatingPartition ? "Creating…" : "Create next quarter"}
          </button>
        </div>
        {loadingP && <AdminTableSkeleton rows={4} columns={4} />}
        {!loadingP && !partitions?.length && (
          <p className={styles.empty}>No partitions found.</p>
        )}
        {!loadingP && !!partitions?.length && (
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Partition</th>
                  <th>From</th>
                  <th>To</th>
                  <th>Size</th>
                </tr>
              </thead>
              <tbody>
                {partitions.map((p) => (
                  <tr key={p.partitionName}>
                    <td className={styles.partitionName}>{p.partitionName}</td>
                    <td className={styles.dateCell}>{p.fromValue}</td>
                    <td className={styles.dateCell}>{p.toValue}</td>
                    <td>{p.estimatedSize}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
