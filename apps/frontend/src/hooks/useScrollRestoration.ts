"use client";

import { useEffect } from "react";

export function useScrollRestoration(key: string): void {
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(key);
      if (saved) {
        window.scrollTo(0, Number(saved));
        sessionStorage.removeItem(key);
      }
    } catch {
      // sessionStorage unavailable
    }

    return () => {
      try {
        sessionStorage.setItem(key, String(window.scrollY));
      } catch {
        // sessionStorage unavailable
      }
    };
  }, [key]);
}
