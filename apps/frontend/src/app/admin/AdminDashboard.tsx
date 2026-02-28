'use client';

import { useProducts, useCategories } from '@/features/products/hooks';
import { useAdminOrders, useAdminUsers } from '@/features/admin/hooks';
import styles from './page.module.scss';

export function AdminDashboard() {
  const { data: productsData } = useProducts({ page: 1, limit: 1 });
  const { data: categoriesData } = useCategories();
  const { data: ordersData } = useAdminOrders(1);
  const { data: usersData } = useAdminUsers();

  const stats = [
    { label: 'Total Products', value: productsData?.meta.total ?? 0, accent: 'products' },
    { label: 'Total Categories', value: categoriesData?.meta.total ?? 0, accent: 'categories' },
    { label: 'Total Orders', value: ordersData?.meta.total ?? 0, accent: 'orders' },
    { label: 'Total Users', value: usersData?.length ?? 0, accent: 'users' },
  ];

  return (
    <div className={styles.dashboard}>
      <div className={styles.header}>
        <h1 className={styles.title}>Admin Dashboard</h1>
        <p className={styles.subtitle}>Monitor store activity and manage catalog operations.</p>
      </div>

      <div className={styles.grid}>
        {stats.map((stat) => (
          <div key={stat.label} className={`${styles.card} ${styles[stat.accent]}`}>
            <p className={styles.label}>{stat.label}</p>
            <p className={styles.value}>{stat.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
