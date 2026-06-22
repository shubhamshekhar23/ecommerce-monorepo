import { forwardRef } from "react";
import { ErrorMessage } from "./ErrorMessage";
import styles from "./Checkbox.module.scss";

interface CheckboxProps extends Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "type"
> {
  id: string;
  label: string;
  error?: string;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ id, label, error, className, ...rest }, ref) => {
    const errorId = `${id}-error`;

    return (
      <div className={styles.field}>
        <label htmlFor={id} className={styles.label}>
          <input
            ref={ref}
            id={id}
            type="checkbox"
            aria-invalid={error ? "true" : undefined}
            aria-describedby={error ? errorId : undefined}
            className={`${styles.checkbox}${className ? ` ${className}` : ""}`}
            {...rest}
          />
          <span className={styles.labelText}>{label}</span>
        </label>
        <ErrorMessage message={error} id={errorId} />
      </div>
    );
  },
);

Checkbox.displayName = "Checkbox";
