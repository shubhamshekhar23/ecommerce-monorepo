"use client";

import { useCallback } from "react";
import { useLocalStorage } from "./useLocalStorage";

const MAX_RECENT = 10;
const STORAGE_KEY = "recent-searches";

export function useRecentSearches(): {
  recentSearches: string[];
  saveSearch: (term: string) => void;
  clearSearches: () => void;
} {
  const [recentSearches, setRecentSearches] = useLocalStorage<string[]>(
    STORAGE_KEY,
    [],
  );

  const saveSearch = useCallback(
    (term: string) => {
      const trimmed = term.trim();
      if (!trimmed) return;
      setRecentSearches((prev) => {
        const filtered = prev.filter((s) => s !== trimmed);
        return [trimmed, ...filtered].slice(0, MAX_RECENT);
      });
    },
    [setRecentSearches],
  );

  const clearSearches = useCallback(() => {
    setRecentSearches([]);
  }, [setRecentSearches]);

  return { recentSearches, saveSearch, clearSearches };
}
