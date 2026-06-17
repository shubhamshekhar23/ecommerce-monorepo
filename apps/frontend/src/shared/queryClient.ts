// src/shared/queryClient.ts
// TanStack React Query client configuration

import { QueryClient } from "@tanstack/react-query";
import { AppError } from "./errors";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 1 minute default — individual hooks override as needed
      gcTime: 10 * 60 * 1000, // 10 minutes
      // Only retry network/server errors — never retry business, auth, or validation failures
      retry: (failureCount, error) => {
        if (error instanceof AppError) {
          if (error.category === "network" || error.category === "server") {
            return failureCount < 3;
          }
          return false;
        }
        return failureCount < 1;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30_000),
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
});
