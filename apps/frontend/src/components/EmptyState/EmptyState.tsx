import Link from 'next/link';
import type { ReactNode } from 'react';
import styles from './EmptyState.module.scss';

interface EmptyStateAction {
  label: string;
  href?: string;
  onClick?: () => void;
}

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: EmptyStateAction;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className={styles.container}>
      {icon && <div className={styles.icon}>{icon}</div>}
      <h2 className={styles.title}>{title}</h2>
      {description && <p className={styles.description}>{description}</p>}
      {action && (
        action.href ? (
          <Link href={action.href} className={styles.action}>
            {action.label}
          </Link>
        ) : (
          <button onClick={action.onClick} className={styles.action}>
            {action.label}
          </button>
        )
      )}
    </div>
  );
}
