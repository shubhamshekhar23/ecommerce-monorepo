import { forwardRef } from 'react';
import * as Label from '@radix-ui/react-label';
import { ErrorMessage } from './ErrorMessage';
import styles from './Input.module.scss';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  id: string;
  label: string;
  error?: string;
  hint?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ id, label, error, hint, className, ...rest }, ref) => {
    const errorId = `${id}-error`;
    const hintId = `${id}-hint`;
    const describedBy = [error ? errorId : null, hint ? hintId : null].filter(Boolean).join(' ') || undefined;

    return (
      <div className={styles.field}>
        <Label.Root htmlFor={id} className={styles.label}>
          {label}
        </Label.Root>
        <input
          ref={ref}
          id={id}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={describedBy}
          className={`${styles.input}${className ? ` ${className}` : ''}`}
          {...rest}
        />
        {hint && !error && (
          <span id={hintId} className={styles.hint}>
            {hint}
          </span>
        )}
        <ErrorMessage message={error} id={errorId} />
      </div>
    );
  },
);

Input.displayName = 'Input';
