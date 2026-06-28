"use client";

import { useState } from "react";
import {
  useQueueStats,
  useDlqJobs,
  useRetryDlqJob,
  useClearDlq,
} from "@/features/admin";
import { AdminTableSkeleton } from "@/features/admin";
import styles from "./QueuePage.module.scss";

const QUEUES = ["stock-alerts", "cart-recovery"];

export function QueuePage() {
  const {
    data: stats,
    isLoading: statsLoading,
    dataUpdatedAt,
  } = useQueueStats();
  const [selectedQueue, setSelectedQueue] = useState<string | undefined>(
    undefined,
  );
  const { data: dlqJobs, isLoading: dlqLoading } = useDlqJobs(selectedQueue);
  const { mutate: retry, isPending: isRetrying } = useRetryDlqJob();
  const [clearConfirmQueue, setClearConfirmQueue] = useState<string | null>(
    null,
  );
  const { mutate: clear, isPending: isClearing } = useClearDlq();

  const lastRefreshed = dataUpdatedAt
    ? new Date(dataUpdatedAt).toLocaleTimeString()
    : "—";

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Queue Monitor</h1>
        <span className={styles.refreshLabel}>
          Refreshes every 10s · Last: {lastRefreshed}
        </span>
      </div>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Queue Stats</h2>
        {statsLoading && <AdminTableSkeleton rows={2} columns={5} />}
        {stats && (
          <div className={styles.statsGrid}>
            {Object.entries(stats).map(([queueName, counts]) => (
              <div key={queueName} className={styles.statCard}>
                <p className={styles.queueName}>{queueName}</p>
                <div className={styles.countsRow}>
                  {Object.entries(counts).map(([state, count]) => (
                    <div
                      key={state}
                      className={`${styles.countChip} ${styles[`state_${state}`]}`}
                    >
                      <span className={styles.countValue}>{count}</span>
                      <span className={styles.countLabel}>{state}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className={styles.section}>
        <div className={styles.dlqHeader}>
          <h2 className={styles.sectionTitle}>Dead Letter Queue</h2>
          <div className={styles.dlqControls}>
            <select
              className={styles.queueSelect}
              value={selectedQueue ?? ""}
              onChange={(e) => setSelectedQueue(e.target.value || undefined)}
            >
              <option value="">All queues</option>
              {QUEUES.map((q) => (
                <option key={q} value={q}>
                  {q}
                </option>
              ))}
            </select>

            {selectedQueue &&
              (clearConfirmQueue === selectedQueue ? (
                <div className={styles.confirmRow}>
                  <span className={styles.confirmText}>
                    Clear all failed jobs?
                  </span>
                  <button
                    className={styles.confirmYes}
                    disabled={isClearing}
                    onClick={() =>
                      clear(selectedQueue, {
                        onSettled: () => setClearConfirmQueue(null),
                      })
                    }
                  >
                    Yes, clear
                  </button>
                  <button
                    className={styles.confirmNo}
                    onClick={() => setClearConfirmQueue(null)}
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  className={styles.clearBtn}
                  onClick={() => setClearConfirmQueue(selectedQueue)}
                >
                  Clear all
                </button>
              ))}
          </div>
        </div>

        {dlqLoading && <AdminTableSkeleton rows={3} columns={4} />}
        {!dlqLoading && !dlqJobs?.length && (
          <p className={styles.empty}>
            No failed jobs{selectedQueue ? ` in ${selectedQueue}` : ""}.
          </p>
        )}
        {!dlqLoading && !!dlqJobs?.length && (
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Job ID</th>
                  <th>Name</th>
                  <th>Failed Reason</th>
                  <th>Attempts</th>
                  <th>Failed At</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {dlqJobs.map((job) => (
                  <tr key={job.id}>
                    <td className={styles.jobId}>{job.id}</td>
                    <td>{job.name}</td>
                    <td className={styles.failReason}>{job.failedReason}</td>
                    <td>{job.attemptsMade}</td>
                    <td className={styles.date}>
                      {new Date(job.timestamp).toLocaleString()}
                    </td>
                    <td>
                      {selectedQueue ? (
                        <button
                          className={styles.retryBtn}
                          disabled={isRetrying}
                          onClick={() =>
                            retry({ jobId: job.id, queue: selectedQueue })
                          }
                        >
                          Retry
                        </button>
                      ) : (
                        <span className={styles.muted}>
                          Select a queue to retry
                        </span>
                      )}
                    </td>
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
