"use client";

import styles from "./Footer.module.scss";

export function BackToTopButton() {
  const handleClick = (): void => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <button className={styles.backToTop} onClick={handleClick}>
      Back to top
    </button>
  );
}
