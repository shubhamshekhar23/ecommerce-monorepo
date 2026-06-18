"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useCallback } from "react";

/**
 * Read and write a single URL search param as state.
 * Setting to null removes the param from the URL.
 * All existing params are preserved; page is reset when any filter changes.
 */
export function useUrlState(
  key: string,
): [string | null, (value: string | null) => void] {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const value = searchParams.get(key);

  const setValue = useCallback(
    (newValue: string | null) => {
      const params = new URLSearchParams(searchParams.toString());

      if (newValue === null || newValue === "") {
        params.delete(key);
      } else {
        params.set(key, newValue);
      }

      // Reset pagination when any filter changes
      params.delete("page");

      const query = params.toString();
      router.push(query ? `${pathname}?${query}` : pathname);
    },
    [key, pathname, router, searchParams],
  );

  return [value, setValue];
}
