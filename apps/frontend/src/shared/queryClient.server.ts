import { QueryClient } from "@tanstack/react-query";
import { AppError } from "./errors";

// Per-request factory — never use the client singleton on the server.
// Each RSC render calls this once and discards the instance after dehydrating.
export function makeServerQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
        gcTime: 10 * 60 * 1000,
        retry: (failureCount, error) => {
          if (error instanceof AppError) {
            if (error.category === "network" || error.category === "server") {
              return failureCount < 3;
            }
            return false;
          }
          return failureCount < 1;
        },
        retryDelay: (attemptIndex) =>
          Math.min(1000 * 2 ** attemptIndex, 30_000),
        refetchOnWindowFocus: false,
      },
      mutations: {
        retry: 0,
      },
    },
  });
}
