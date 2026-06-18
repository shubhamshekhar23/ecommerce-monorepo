// src/app/admin/products/page.tsx

import type { Metadata } from 'next';
import dynamic from 'next/dynamic';

export const metadata: Metadata = {
  title: 'Products | Admin',
  description: 'Manage products',
  robots: { index: false },
};

// Split admin views out of the main bundle — regular users never load them.
const AdminProductsView = dynamic(
  () =>
    import(
      '@/features/admin/components/AdminProductsView/AdminProductsView'
    ).then((m) => m.AdminProductsView),
  { ssr: false },
);

export default function ProductsAdminPage() {
  return <AdminProductsView />;
}
