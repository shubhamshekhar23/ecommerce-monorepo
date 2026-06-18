'use client';

import { useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useAdminUsers } from '../../hooks';
import styles from './AdminUsersView.module.scss';

export function AdminUsersView() {
  const { data: users, isLoading } = useAdminUsers();
  const userList = users ?? [];

  const parentRef = useRef<HTMLDivElement>(null);
  const rowVirtualizer = useVirtualizer({
    count: userList.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 52,
    overscan: 5,
  });

  if (isLoading) {
    return <div className={styles.loading}>Loading users...</div>;
  }

  if (userList.length === 0) {
    return (
      <div className={styles.container}>
        <h1 className={styles.title}>Users</h1>
        <div className={styles.empty}>No users found.</div>
      </div>
    );
  }

  const virtualItems = rowVirtualizer.getVirtualItems();
  const totalSize = rowVirtualizer.getTotalSize();
  const paddingTop = virtualItems.length > 0 ? virtualItems[0].start : 0;
  const paddingBottom =
    virtualItems.length > 0 ? totalSize - virtualItems[virtualItems.length - 1].end : 0;

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Users</h1>

      <div ref={parentRef} className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Active</th>
              <th>Joined</th>
            </tr>
          </thead>
          <tbody>
            {paddingTop > 0 && (
              <tr>
                <td colSpan={5} style={{ height: paddingTop, padding: 0 }} />
              </tr>
            )}
            {virtualItems.map((virtualRow) => {
              const user = userList[virtualRow.index];
              return (
                <tr key={user.id}>
                  <td className={styles.name}>
                    {user.firstName} {user.lastName}
                  </td>
                  <td>{user.email}</td>
                  <td>{user.role}</td>
                  <td>{user.isActive ? '✓' : '✗'}</td>
                  <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                </tr>
              );
            })}
            {paddingBottom > 0 && (
              <tr>
                <td colSpan={5} style={{ height: paddingBottom, padding: 0 }} />
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
