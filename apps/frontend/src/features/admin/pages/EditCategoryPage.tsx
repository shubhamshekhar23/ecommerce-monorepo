"use client";

import { useAdminCategory } from "@/features/admin/hooks";
import { CategoryForm } from "@/features/admin";
import { Breadcrumb } from "@/components/Breadcrumb/Breadcrumb";

interface Props {
  categoryId: string;
}

export function EditCategoryPage({ categoryId }: Props) {
  const { data: category, isLoading, error } = useAdminCategory(categoryId);

  if (isLoading) {
    return (
      <div style={{ padding: "24px", textAlign: "center" }}>
        Loading category...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: "24px", textAlign: "center", color: "#cb2431" }}>
        Error loading category: {error.message}
      </div>
    );
  }

  if (!category) {
    return (
      <div style={{ padding: "24px", textAlign: "center" }}>
        Category not found
      </div>
    );
  }

  return (
    <>
      <Breadcrumb
        items={[
          { label: "Admin", href: "/admin" },
          { label: "Categories", href: "/admin/categories" },
          { label: `Edit: ${category.name}` },
        ]}
      />
      <CategoryForm category={category} />
    </>
  );
}
