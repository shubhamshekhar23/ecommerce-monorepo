"use client";

import { useTheme } from "@/shared/theme/useTheme";
import styles from "./ThemeToggle.module.scss";

export function ThemeToggle() {
  const { theme, toggleTheme, mounted } = useTheme();

  // Render nothing until mounted to avoid hydration mismatch.
  // The FOUC-prevention script in layout.tsx ensures correct theme is set before paint.
  if (!mounted) return null;

  const isDark = theme === "dark";

  return (
    <button
      className={styles.toggle}
      onClick={toggleTheme}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      aria-pressed={isDark}
    >
      <span className={styles.icon} aria-hidden="true">
        {isDark ? "☀️" : "🌙"}
      </span>
    </button>
  );
}
