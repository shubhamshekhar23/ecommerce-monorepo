"use client";

import { useEffect, useState } from "react";

interface NetworkInformation extends EventTarget {
  readonly effectiveType: "slow-2g" | "2g" | "3g" | "4g";
  readonly saveData: boolean;
}

type NavigatorWithConnection = Navigator & {
  connection?: NetworkInformation;
};

function getIsSlowConnection(): boolean {
  if (typeof navigator === "undefined") return false;
  const conn = (navigator as NavigatorWithConnection).connection;
  if (!conn) return false;
  return (
    conn.saveData ||
    conn.effectiveType === "slow-2g" ||
    conn.effectiveType === "2g"
  );
}

/**
 * Returns the image quality value to pass to Next.js <Image quality={}>.
 * On slow connections (2g / save-data mode) returns 40 to reduce payload.
 * Falls back to 80 when the Network Information API is unsupported (Firefox, Safari).
 */
export function useImageQuality(): number {
  const [isSlow, setIsSlow] = useState(() => getIsSlowConnection());

  useEffect(() => {
    const conn = (navigator as NavigatorWithConnection).connection;
    if (!conn) return;
    const update = () => setIsSlow(getIsSlowConnection());
    conn.addEventListener("change", update);
    return () => conn.removeEventListener("change", update);
  }, []);

  return isSlow ? 40 : 80;
}
