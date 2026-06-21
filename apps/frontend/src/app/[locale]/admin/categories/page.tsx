// src/app/admin/categories/page.tsx

import type { Metadata } from "next";
import { AdminCategoriesClientWrapper } from "./AdminCategoriesClientWrapper";

export const metadata: Metadata = {
  title: "Categories | Admin",
  description: "Manage categories",
  robots: { index: false },
};

export default function CategoriesAdminPage() {
  return <AdminCategoriesClientWrapper />;
}
