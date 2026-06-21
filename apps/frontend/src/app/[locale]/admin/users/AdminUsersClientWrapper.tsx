"use client";

import dynamic from "next/dynamic";

const AdminUsersView = dynamic(
  () =>
    import("@/features/admin/components/AdminUsersView/AdminUsersView").then(
      (m) => m.AdminUsersView,
    ),
  { ssr: false },
);

export function AdminUsersClientWrapper() {
  return <AdminUsersView />;
}
