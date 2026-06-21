"use client";

import dynamic from "next/dynamic";

const AdminOrdersView = dynamic(
  () =>
    import("@/features/admin/components/AdminOrdersView/AdminOrdersView").then(
      (m) => m.AdminOrdersView,
    ),
  { ssr: false },
);

export function AdminOrdersClientWrapper() {
  return <AdminOrdersView />;
}
