"use client";

import dynamic from "next/dynamic";

const AdminProductsView = dynamic(
  () =>
    import("@/features/admin/components/AdminProductsView/AdminProductsView").then(
      (m) => m.AdminProductsView,
    ),
  { ssr: false },
);

export function AdminProductsClientWrapper() {
  return <AdminProductsView />;
}
