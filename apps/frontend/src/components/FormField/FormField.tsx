// src/components/FormField/FormField.tsx
// Reusable form field wrapper with label and error display

import * as Label from '@radix-ui/react-label';
import styles from './FormField.module.scss';

interface FormFieldProps {
  id: string;
  label: string;
  error?: string;
  children: React.ReactNode;
}

export function FormField({ id, label, error, children }: FormFieldProps) {
  return (
    <div className={styles.field}>
      <Label.Root htmlFor={id} className={styles.label}>
        {label}
      </Label.Root>
      {children}
      {error && (
        <span id={`${id}-error`} role="alert" className={styles.error}>
          {error}
        </span>
      )}
    </div>
  );
}
