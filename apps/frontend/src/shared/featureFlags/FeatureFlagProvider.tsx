'use client';

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { type Flags, defaultFlags, loadFlagsFromEnv } from './featureFlags';

const FeatureFlagContext = createContext<Flags>(defaultFlags);

export function FeatureFlagProvider({ children }: { children: ReactNode }) {
  // Level 1: env vars — statically inlined by Next.js bundler at build time.
  // To evolve to Level 2 (runtime JSON) or Level 3 (LaunchDarkly), replace
  // loadFlagsFromEnv() with a fetch/SDK call here without changing consumers.
  const flags = useMemo(() => loadFlagsFromEnv(), []);

  return (
    <FeatureFlagContext.Provider value={flags}>
      {children}
    </FeatureFlagContext.Provider>
  );
}

export function useFeatureFlag(key: keyof Flags): boolean {
  return useContext(FeatureFlagContext)[key];
}

export function useFeatureFlags(): Flags {
  return useContext(FeatureFlagContext);
}
