import { forwardRef } from "react";
import * as Label from "@radix-ui/react-label";
import { ErrorMessage } from "./ErrorMessage";
import styles from "./Select.module.scss";

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ id, label, error, hint, className, children, ...rest }, ref) => {
    const errorId = `${id}-error`;
    const hintId = `${id}-hint`;
    const describedBy =
      [error ? errorId : null, hint ? hintId : null]
        .filter(Boolean)
        .join(" ") || undefined;

    return (
      <div className={styles.field}>
        <Label.Root htmlFor={id} className={styles.label}>
          {label}
        </Label.Root>
        <select
          ref={ref}
          id={id}
          aria-invalid={error ? "true" : undefined}
          aria-describedby={describedBy}
          className={`${styles.select}${className ? ` ${className}` : ""}`}
          {...rest}
        >
          {children}
        </select>
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

Select.displayName = "Select";
