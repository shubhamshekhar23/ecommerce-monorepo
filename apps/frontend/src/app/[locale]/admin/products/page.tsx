// src/app/admin/products/page.tsx

import type { Metadata } from "next";
import { AdminProductsClientWrapper } from "./AdminProductsClientWrapper";

export const metadata: Metadata = {
  title: "Products | Admin",
  description: "Manage products",
  robots: { index: false },
};

export default function ProductsAdminPage() {
  return <AdminProductsClientWrapper />;
}
