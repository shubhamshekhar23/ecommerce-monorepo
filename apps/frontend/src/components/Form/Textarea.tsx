import { forwardRef } from 'react';
import * as Label from '@radix-ui/react-label';
import { ErrorMessage } from './ErrorMessage';
import styles from './Textarea.module.scss';

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  id: string;
  label: string;
  error?: string;
  hint?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ id, label, error, hint, className, ...rest }, ref) => {
    const errorId = `${id}-error`;
    const hintId = `${id}-hint`;
    const describedBy = [error ? errorId : null, hint ? hintId : null].filter(Boolean).join(' ') || undefined;

    return (
      <div className={styles.field}>
        <Label.Root htmlFor={id} className={styles.label}>
          {label}
        </Label.Root>
        <textarea
          ref={ref}
          id={id}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={describedBy}
          className={`${styles.textarea}${className ? ` ${className}` : ''}`}
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

Textarea.displayName = 'Textarea';
