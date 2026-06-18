import styles from './FieldGroup.module.scss';

interface FieldGroupProps {
  label: string;
  children: React.ReactNode;
  className?: string;
}

export function FieldGroup({ label, children, className }: FieldGroupProps) {
  return (
    <fieldset className={`${styles.group}${className ? ` ${className}` : ''}`}>
      <legend className={styles.legend}>{label}</legend>
      <div className={styles.fields}>{children}</div>
    </fieldset>
  );
}
