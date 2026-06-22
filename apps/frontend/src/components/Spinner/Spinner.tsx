import styles from "./Spinner.module.scss";

interface SpinnerProps {
  size?: "sm" | "md" | "lg";
  "aria-label"?: string;
}

export function Spinner({
  size = "md",
  "aria-label": ariaLabel = "Loading",
}: SpinnerProps) {
  return (
    <span
      className={`${styles.spinner} ${styles[size]}`}
      role="status"
      aria-label={ariaLabel}
    />
  );
}
