import { AppError } from "@/shared/errors";

export function resolveAuthError(error: unknown, fallback: string): string {
  if (!(error instanceof AppError)) return fallback;
  if (error.statusCode === 429)
    return "Too many attempts. Please wait a few minutes and try again.";
  return error.userMessage || fallback;
}
