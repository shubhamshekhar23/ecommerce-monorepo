// src/app/admin/layout.tsx

"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
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

  return (
    <div className={styles.container}>
      <AdminNav />
      <main className={styles.main}>{children}</main>
    </div>
  );
}
