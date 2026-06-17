export type ErrorCategory =
  | "validation"
  | "business"
  | "auth"
  | "network"
  | "server"
  | "unknown";

export class AppError extends Error {
  constructor(
    public readonly category: ErrorCategory,
    public readonly userMessage: string,
    public readonly statusCode?: number,
    public readonly originalError?: unknown,
  ) {
    super(userMessage);
    this.name = "AppError";
  }
}
