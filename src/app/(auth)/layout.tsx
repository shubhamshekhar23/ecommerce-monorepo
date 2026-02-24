// src/app/(auth)/layout.tsx
// Auth pages layout - centered card design

import styles from './auth.layout.module.scss';

interface AuthLayoutProps {
  children: React.ReactNode;
}

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className={styles.container}>
      <div className={styles.card}>{children}</div>
    </div>
  );
}
