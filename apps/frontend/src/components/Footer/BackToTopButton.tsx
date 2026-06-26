"use client";

import styles from "./Footer.module.scss";

export function BackToTopButton() {
  const handleClick = (): void => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <button className={styles.backToTop} onClick={handleClick}>
      Back to top
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M12 19V5M5 12l7-7 7 7"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}
