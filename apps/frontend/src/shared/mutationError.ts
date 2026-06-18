import { toast } from "sonner";
import { AppError } from "./errors";

/**
 * Standard per-category error handler for mutation onError callbacks.
 *
 * Category routing:
 *   network   → "Check your connection" toast (user can retry manually)
 *   auth      → redirect to login (session expired mid-action)
 *   validation → show the server's specific validation message
 *   business  → show the server's specific business rule message
 *   server    → generic "something went wrong on our end"
 *   unknown   → fallback message
 */
export function handleMutationError(error: unknown, fallback: string): void {
  if (!(error instanceof AppError)) {
    toast.error(fallback);
    return;
  }

  switch (error.category) {
    case "network":
      toast.error("Check your connection and try again.");
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
      toast.error("Something went wrong on our end. Please try again.");
      break;
    default:
      toast.error(fallback);
  }
}
