"use client";

import dynamic from "next/dynamic";

const AdminCategoriesView = dynamic(
  () =>
    import("@/features/admin/components/AdminCategoriesView/AdminCategoriesView").then(
      (m) => m.AdminCategoriesView,
    ),
  { ssr: false },
);

export function AdminCategoriesClientWrapper() {
  return <AdminCategoriesView />;
}
