"use client";

import { type ReactNode } from "react";
import { notFound } from "next/navigation";
import { useFeatureFlag } from "./FeatureFlagProvider";
import type { Flags } from "./featureFlags";

interface FlagGuardProps {
  flag: keyof Flags;
  children: ReactNode;
  /** Rendered when flag is off. Defaults to notFound(). */
  fallback?: ReactNode;
}

export function FlagGuard({ flag, children, fallback }: FlagGuardProps) {
  const enabled = useFeatureFlag(flag);

  if (!enabled) {
    if (fallback !== undefined) return <>{fallback}</>;
    notFound();
  }

  return <>{children}</>;
}
