"use client";

import { useState } from "react";
import {
  useRequestDataDeletion,
  useCancelDataDeletion,
} from "@/features/account";
import { useAuthStore } from "@/store/auth.store";
import styles from "./PrivacyPage.module.scss";

export function PrivacyPage() {
  const user = useAuthStore((s) => s.user);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const { mutate: requestDeletion, isPending: isRequesting } =
    useRequestDataDeletion();
  const { mutate: cancelDeletion, isPending: isCancelling } =
    useCancelDataDeletion();

  // The backend returns deletionRequestedAt on the user object when a request is pending.
  const deletionPending = !!(
    user as (typeof user & { deletionRequestedAt?: string }) | null
  )?.deletionRequestedAt;

  return (
    <div className={styles.page}>
      <h2 className={styles.heading}>Privacy & Data</h2>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>What we store</h3>
        <p className={styles.body}>
          We store your name, email address, order history, saved addresses, and
          product reviews. We never sell your data to third parties.
        </p>
      </section>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Request data deletion</h3>
        <p className={styles.body}>
          You can request permanent deletion of all your personal data. Once
          requested, your account and associated data will be scheduled for
          deletion. You have 30 days to cancel before it is processed.
        </p>

        {deletionPending ? (
          <div className={styles.pendingBanner}>
            <p>Your data deletion request is pending.</p>
            <button
              onClick={() => cancelDeletion()}
              disabled={isCancelling}
              className={styles.cancelBtn}
            >
              {isCancelling ? "Cancelling..." : "Cancel deletion"}
            </button>
          </div>
        ) : (
          <>
            {confirmOpen ? (
              <div className={styles.confirmBox}>
                <p className={styles.confirmText}>
                  Are you sure? This will schedule deletion of all your personal
                  data. You have 30 days to cancel.
                </p>
                <div className={styles.confirmActions}>
                  <button
                    onClick={() =>
                      requestDeletion(undefined, {
                        onSuccess: () => setConfirmOpen(false),
                      })
                    }
                    disabled={isRequesting}
                    className={styles.dangerBtn}
                  >
                    {isRequesting ? "Requesting..." : "Yes, request deletion"}
                  </button>
                  <button
                    onClick={() => setConfirmOpen(false)}
                    className={styles.secondaryBtn}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setConfirmOpen(true)}
                className={styles.dangerBtn}
              >
                Request data deletion
              </button>
            )}
          </>
        )}
      </section>
    </div>
  );
}
