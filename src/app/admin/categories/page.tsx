// src/app/admin/categories/page.tsx

import type { Metadata } from 'next';
import { AdminCategoriesView } from '@/features/admin/components/AdminCategoriesView/AdminCategoriesView';

export const metadata: Metadata = {
  title: 'Categories | Admin',
  description: 'Manage categories',
};

export default function CategoriesAdminPage() {
  return <AdminCategoriesView />;
}
