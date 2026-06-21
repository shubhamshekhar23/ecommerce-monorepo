import { toast } from "sonner";
import { AppError } from "./errors";

/**
 * Standard per-category error handler for mutation onError callbacks.
 *
 * Pass `retry` (a function that re-fires the mutation) to show a
 * "Try Again" button in the toast for network and server errors.
 * This fires after TanStack Query's automatic retries have exhausted.
 *
 * Category routing:
 *   network    → "Check your connection" toast + optional "Try Again" button
 *   auth       → redirect to login (session expired mid-action)
 *   validation → show the server's specific validation message
 *   business   → show the server's specific business rule message
 *   server     → generic "something went wrong" toast + optional "Try Again" button
 *   unknown    → fallback message
 */
export function handleMutationError(
  error: unknown,
  fallback: string,
  retry?: () => void,
): void {
  if (!(error instanceof AppError)) {
    toast.error(fallback);
    return;
  }

  const retryAction = retry
    ? { action: { label: "Try Again", onClick: retry } }
    : {};

  switch (error.category) {
    case "network":
      toast.error("Check your connection and try again.", retryAction);
      break;
    case "auth":
      if (typeof window !== "undefined") {
        window.location.href = "/login?session_expired=1";
      }
      break;
    case "validation":
    case "business":
      toast.error(error.userMessage);
      break;
    case "server":
      toast.error(
        "Something went wrong on our end. Please try again.",
        retryAction,
      );
      break;
    default:
      toast.error(fallback);
  }
}
