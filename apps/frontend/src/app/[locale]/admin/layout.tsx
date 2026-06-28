// src/app/admin/layout.tsx

"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/store/auth.store";
import { AdminNav } from "@/features/admin";
import styles from "./layout.module.scss";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const status = useAuthStore((state) => state.status);

  useEffect(() => {
    // Wait for the user profile to load (status="authenticated" but user still null
    // means useAuthHydration hasn't resolved yet — don't redirect prematurely).
    if (status === "loading" || (status === "authenticated" && user === null))
      return;

    if (
      status === "unauthenticated" ||
      (status === "authenticated" && user?.role !== "ADMIN")
    ) {
      router.replace("/");
    }
  }, [status, user, router]);

  // Don't render until we've verified the user is an admin
  if (status !== "authenticated" || user?.role !== "ADMIN") {
    return null;
  }

  const formattedDate = new Date().toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  return (
    <div className={styles.container}>
      <AdminNav />
      <div className={styles.mainWrapper}>
        <div className={styles.topBar}>
          <div className={styles.topBarLeft}>
            <span className={styles.topBarDate}>{formattedDate}</span>
          </div>
          <div className={styles.topBarRight}>
            <button className={styles.bellBtn} aria-label="Notifications">
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M8 1a4.5 4.5 0 0 0-4.5 4.5c0 1.71-.45 3.09-1.1 4.13A1 1 0 0 0 3.25 11h9.5a1 1 0 0 0 .85-1.37C12.95 8.59 12.5 7.21 12.5 5.5A4.5 4.5 0 0 0 8 1ZM6.5 13a1.5 1.5 0 0 0 3 0h-3Z"
                  fill="currentColor"
                />
              </svg>
            </button>
            <Link href="/" className={styles.viewStoreBtn}>
              <svg
                width="13"
                height="13"
                viewBox="0 0 13 13"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M7.5 1.5h4m0 0v4m0-4L5.5 7.5M4 2.5H2a1 1 0 0 0-1 1v7.5a1 1 0 0 0 1 1h7.5a1 1 0 0 0 1-1v-2"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              View store
            </Link>
          </div>
        </div>
        <main className={styles.main}>{children}</main>
      </div>
    </div>
  );
}
