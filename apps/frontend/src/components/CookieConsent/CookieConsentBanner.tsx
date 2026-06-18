'use client';

import Link from 'next/link';
import { useCookieConsent } from '@/shared/cookieConsent/useCookieConsent';
import styles from './CookieConsentBanner.module.scss';

export function CookieConsentBanner() {
  const { hasDecided, acceptAll, rejectNonEssential } = useCookieConsent();

  // null = still hydrating; true = already decided. Either way, do not render.
  if (hasDecided !== false) return null;

  return (
    <div
      className={styles.banner}
      role="dialog"
      aria-modal="false"
      aria-labelledby="cookie-banner-heading"
    >
      <div className={styles.inner}>
        <p id="cookie-banner-heading" className={styles.text}>
          We use cookies for analytics and error tracking to improve your experience.
          Strictly necessary cookies (auth, session) are always active. See our{' '}
          <Link href="/privacy" className={styles.link}>
            Privacy Policy
          </Link>
          .
        </p>
        <div className={styles.actions}>
          <button className={styles.rejectBtn} onClick={rejectNonEssential}>
            Reject Non-Essential
          </button>
          <button className={styles.acceptBtn} onClick={acceptAll}>
            Accept All
          </button>
        </div>
      </div>
    </div>
  );
}
