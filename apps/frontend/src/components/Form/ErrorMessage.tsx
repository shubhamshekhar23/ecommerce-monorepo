import styles from './ErrorMessage.module.scss';

interface ErrorMessageProps {
  message?: string;
  id?: string;
}

export function ErrorMessage({ message, id }: ErrorMessageProps) {
  if (!message) return null;
  return (
    <span id={id} role="alert" className={styles.error}>
      {message}
    </span>
  );
}
