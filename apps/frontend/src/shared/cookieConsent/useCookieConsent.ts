"use client";

import { useState, useEffect } from "react";

const CONSENT_KEY = "cookie-consent";
// Bump this version when the privacy policy changes to re-prompt existing users.
const CONSENT_VERSION = 1;

export interface ConsentState {
  analytics: boolean;
  errorTracking: boolean;
}

interface StoredConsent extends ConsentState {
  version: number;
  timestamp: number;
}

export interface UseCookieConsentResult {
  // null = not yet hydrated (do not show or hide banner yet)
  // false = user has not decided (show banner)
  // true  = user has decided (hide banner)
  hasDecided: boolean | null;
  consent: ConsentState;
  acceptAll: () => void;
  rejectNonEssential: () => void;
  updateConsent: (category: keyof ConsentState, value: boolean) => void;
}

const DEFAULT_CONSENT: ConsentState = {
  analytics: false,
  errorTracking: false,
};

function readStoredConsent(): StoredConsent | null {
  try {
    const raw = localStorage.getItem(CONSENT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredConsent;
    // Stale version → re-prompt so users see updated policy terms.
    if (parsed.version !== CONSENT_VERSION) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeConsent(state: ConsentState): void {
  try {
    const stored: StoredConsent = {
      ...state,
      version: CONSENT_VERSION,
      timestamp: Date.now(),
    };
    localStorage.setItem(CONSENT_KEY, JSON.stringify(stored));
  } catch {
    /* localStorage blocked */
  }
}

export function useCookieConsent(): UseCookieConsentResult {
  const [consent, setConsent] = useState<ConsentState>(DEFAULT_CONSENT);
  // null prevents the banner from flashing during SSR / hydration.
  const [hasDecided, setHasDecided] = useState<boolean | null>(null);

  useEffect(() => {
    // Respect Do-Not-Track: treat it as "reject non-essential" without prompting.
    if (navigator.doNotTrack === "1") {
      setConsent(DEFAULT_CONSENT);
      setHasDecided(true);
      return;
    }

    const stored = readStoredConsent();
    if (stored) {
      setConsent({
        analytics: stored.analytics,
        errorTracking: stored.errorTracking,
      });
      setHasDecided(true);
    } else {
      setHasDecided(false); // no decision yet → show banner
    }
  }, []);

  const acceptAll = () => {
    const state: ConsentState = { analytics: true, errorTracking: true };
    setConsent(state);
    setHasDecided(true);
    writeConsent(state);
  };

  const rejectNonEssential = () => {
    setConsent(DEFAULT_CONSENT);
    setHasDecided(true);
    writeConsent(DEFAULT_CONSENT);
  };

  const updateConsent = (category: keyof ConsentState, value: boolean) => {
    setConsent((prev) => {
      const next = { ...prev, [category]: value };
      writeConsent(next);
      return next;
    });
    setHasDecided(true);
  };

  return { consent, hasDecided, acceptAll, rejectNonEssential, updateConsent };
}
