import styles from "./AuthSplitPanel.module.scss";

interface AuthSplitPanelProps {
  badge: string;
  headline: string;
  body: string;
  benefits: string[];
  children: React.ReactNode;
}

export function AuthSplitPanel({
  badge,
  headline,
  body,
  benefits,
  children,
}: AuthSplitPanelProps) {
  return (
    <div className={styles.split}>
      <div className={styles.left}>
        <div className={styles.leftInner}>
          <span className={styles.badge}>
            <span className={styles.badgeDot} aria-hidden="true" />
            {badge}
          </span>
          <h2 className={styles.headline}>{headline}</h2>
          <p className={styles.body}>{body}</p>
          <ul className={styles.benefits}>
            {benefits.map((b) => (
              <li key={b} className={styles.benefit}>
                <span className={styles.check} aria-hidden="true">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path
                      d="M2.5 7L5.5 10L11.5 4"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
                {b}
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className={styles.right}>{children}</div>
    </div>
  );
}
