"use client";

import { useState } from "react";
import {
  useAdminReturns,
  useApproveReturn,
  useRejectReturn,
  useRefundReturn,
} from "@/features/admin";
import { AdminTableSkeleton } from "@/features/admin";
import type { ReturnStatus } from "@/features/admin";
import styles from "./ReturnsPage.module.scss";

const STATUS_TABS = [
  "All",
  "PENDING",
  "APPROVED",
  "REFUNDED",
  "REJECTED",
] as const;
type Tab = (typeof STATUS_TABS)[number];

export function ReturnsPage() {
  const { data: returns, isLoading } = useAdminReturns();
  const { mutate: approve, isPending: isApproving } = useApproveReturn();
  const { mutate: reject, isPending: isRejecting } = useRejectReturn();
  const { mutate: refund, isPending: isRefunding } = useRefundReturn();
  const [tab, setTab] = useState<Tab>("All");
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const filtered =
    tab === "All"
      ? returns
      : returns?.filter((r) => r.status === (tab as ReturnStatus));

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Returns</h1>

      <div className={styles.tabBar}>
        {STATUS_TABS.map((t) => (
          <button
            key={t}
            className={tab === t ? styles.tabActive : styles.tab}
            onClick={() => setTab(t)}
          >
            {t}
            {t !== "All" && returns && (
              <span className={styles.badge}>
                {returns.filter((r) => r.status === t).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {isLoading && <AdminTableSkeleton rows={5} columns={5} />}

      {!isLoading && !filtered?.length && (
        <p className={styles.empty}>No returns in this category.</p>
      )}

      {!isLoading && !!filtered?.length && (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Reason</th>
                <th>Items</th>
                <th>Status</th>
                <th>Requested</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((ret) => (
                <tr key={ret.id}>
                  <td className={styles.orderId}>{ret.orderId.slice(0, 8)}…</td>
                  <td>{ret.reason}</td>
                  <td>
                    {ret.items.length} item{ret.items.length !== 1 ? "s" : ""}
                  </td>
                  <td>
                    <span
                      className={`${styles.statusBadge} ${styles[`status${ret.status}`]}`}
                    >
                      {ret.status}
                    </span>
                  </td>
                  <td className={styles.date}>
                    {new Date(ret.createdAt).toLocaleDateString()}
                  </td>
                  <td className={styles.actions}>
                    {ret.status === "PENDING" && (
                      <>
                        <button
                          className={styles.approveBtn}
                          onClick={() => approve(ret.id)}
                          disabled={isApproving}
                        >
                          Approve
                        </button>
                        {rejectId === ret.id ? (
                          <div className={styles.rejectPanel}>
                            <input
                              type="text"
                              placeholder="Rejection reason"
                              value={rejectReason}
                              onChange={(e) => setRejectReason(e.target.value)}
                              className={styles.rejectInput}
                            />
                            <button
                              className={styles.confirmRejectBtn}
                              disabled={!rejectReason.trim() || isRejecting}
                              onClick={() =>
                                reject(
                                  { id: ret.id, reason: rejectReason },
                                  {
                                    onSuccess: () => {
                                      setRejectId(null);
                                      setRejectReason("");
                                    },
                                  },
                                )
                              }
                            >
                              Confirm
                            </button>
                            <button
                              className={styles.cancelBtn}
                              onClick={() => {
                                setRejectId(null);
                                setRejectReason("");
                              }}
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            className={styles.rejectBtn}
                            onClick={() => setRejectId(ret.id)}
                          >
                            Reject
                          </button>
                        )}
                      </>
                    )}
                    {ret.status === "APPROVED" && (
                      <button
                        className={styles.refundBtn}
                        onClick={() => refund(ret.id)}
                        disabled={isRefunding}
                      >
                        Process Refund
                      </button>
                    )}
                    {(ret.status === "REFUNDED" ||
                      ret.status === "REJECTED") && (
                      <span className={styles.readOnly}>—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
