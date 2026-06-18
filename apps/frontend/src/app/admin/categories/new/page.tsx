// src/app/admin/categories/new/page.tsx

import type { Metadata } from "next";
import { CategoryForm } from "@/features/admin";

export const metadata: Metadata = {
  title: "Create Category | Admin",
  description: "Create a new category",
  robots: { index: false },
};

export default function NewCategoryPage() {
  return <CategoryForm />;
}
