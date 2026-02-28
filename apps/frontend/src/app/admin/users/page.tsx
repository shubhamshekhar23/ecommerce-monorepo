// src/app/admin/users/page.tsx

import type { Metadata } from 'next';
import { AdminUsersView } from '@/features/admin/components/AdminUsersView/AdminUsersView';

export const metadata: Metadata = {
  title: 'Users | Admin',
  description: 'Manage users',
};

export default function UsersAdminPage() {
  return <AdminUsersView />;
}
