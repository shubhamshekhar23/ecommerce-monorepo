// src/app/admin/categories/page.tsx

import type { Metadata } from "next";
import dynamic from "next/dynamic";

export const metadata: Metadata = {
  title: "Categories | Admin",
  description: "Manage categories",
  robots: { index: false },
};

const AdminCategoriesView = dynamic(
  () =>
    import("@/features/admin/components/AdminCategoriesView/AdminCategoriesView").then(
      (m) => m.AdminCategoriesView,
    ),
  { ssr: false },
);

export default function CategoriesAdminPage() {
  return <AdminCategoriesView />;
}
