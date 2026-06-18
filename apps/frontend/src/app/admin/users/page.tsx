// src/app/admin/users/page.tsx

import type { Metadata } from 'next';
import dynamic from 'next/dynamic';

export const metadata: Metadata = {
  title: 'Users | Admin',
  description: 'Manage users',
  robots: { index: false },
};

const AdminUsersView = dynamic(
  () =>
    import(
      '@/features/admin/components/AdminUsersView/AdminUsersView'
    ).then((m) => m.AdminUsersView),
  { ssr: false },
);

export default function UsersAdminPage() {
  return <AdminUsersView />;
}
