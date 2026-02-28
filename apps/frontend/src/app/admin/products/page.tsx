// src/app/admin/products/page.tsx

import type { Metadata } from 'next';
import { AdminProductsView } from '@/features/admin/components/AdminProductsView/AdminProductsView';

export const metadata: Metadata = {
  title: 'Products | Admin',
  description: 'Manage products',
};

export default function ProductsAdminPage() {
  return <AdminProductsView />;
}
