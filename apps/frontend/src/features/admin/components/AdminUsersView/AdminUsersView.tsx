// src/features/admin/components/AdminUsersView/AdminUsersView.tsx

'use client';

import { useAdminUsers } from '../../hooks';
import styles from './AdminUsersView.module.scss';

export function AdminUsersView() {
  const { data: users, isLoading } = useAdminUsers();

  if (isLoading) {
    return <div className={styles.loading}>Loading users...</div>;
  }

  const userList = users || [];

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Users</h1>

      {userList.length === 0 ? (
        <div className={styles.empty}>No users found.</div>
      ) : (
        <div className={styles.tableWrapper}>
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
              {userList.map((user) => (
                <tr key={user.id}>
                  <td className={styles.name}>
                    {user.firstName} {user.lastName}
                  </td>
                  <td>{user.email}</td>
                  <td>{user.role}</td>
                  <td>{user.isActive ? '✓' : '✗'}</td>
                  <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
