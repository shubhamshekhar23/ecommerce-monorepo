// src/app/admin/products/new/page.tsx

import type { Metadata } from "next";
import { ProductForm } from "@/features/admin";

export const metadata: Metadata = {
  title: "Create Product | Admin",
  description: "Create a new product",
  robots: { index: false },
};

export default function NewProductPage() {
  return <ProductForm />;
}
