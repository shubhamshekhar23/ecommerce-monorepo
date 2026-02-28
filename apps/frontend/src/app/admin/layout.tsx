// src/app/admin/layout.tsx

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import { AdminNav } from '@/features/admin/components/AdminNav/AdminNav';
import styles from './layout.module.scss';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const status = useAuthStore((state) => state.status);

  useEffect(() => {
    if (status === 'unauthenticated' || (status === 'authenticated' && user?.role !== 'ADMIN')) {
      router.replace('/');
    }
  }, [status, user, router]);

  // Don't render until we've verified the user is an admin
  if (status !== 'authenticated' || user?.role !== 'ADMIN') {
    return null;
  }

  return (
    <div className={styles.container}>
      <AdminNav />
      <main className={styles.main}>{children}</main>
    </div>
  );
}
