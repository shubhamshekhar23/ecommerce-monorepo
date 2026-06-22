import { toast } from "sonner";
import { AppError } from "./errors";

/**
 * Standard per-category error handler for mutation onError callbacks.
 *
 * Pass `retry` (a function that re-fires the mutation) to show a
 * "Try Again" button for network errors — only those have a chance of
 * succeeding on retry. This fires after TanStack Query's automatic
 * retries have exhausted.
 *
 * Category routing:
 *   network    → red toast (6s) + "Try Again" button if retry provided
 *   auth       → redirect to login (session expired mid-action)
 *   validation → yellow warning toast — user's input is wrong, not the system
 *   business   → red toast — server rejected with a known business reason
 *   server     → red toast (4s), generic message — system error, no retry button
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

  switch (error.category) {
    case "network":
      toast.error("Check your connection and try again.", {
        duration: 6000,
        ...(retry ? { action: { label: "Try Again", onClick: retry } } : {}),
      });
      break;
    case "auth":
      if (typeof window !== "undefined") {
        window.location.href = "/login?session_expired=1";
      }
      break;
    case "validation":
      toast.warning(error.userMessage);
      break;
    case "business":
      toast.error(error.userMessage);
      break;
    case "server":
      toast.error("Something went wrong on our end. Please try again.", {
        duration: 4000,
      });
      break;
    default:
      toast.error(fallback);
  }
}
