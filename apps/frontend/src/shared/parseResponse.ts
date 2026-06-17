import { ZodSchema } from "zod";
import { AppError } from "./errors";

// Parse an API response against a Zod schema and return as the caller's interface type.
// T is specified by the caller (our TypeScript interface); the schema validates the runtime shape.
// Throws AppError('server') if the shape doesn't match.
export function parseResponse<T>(schema: ZodSchema, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join(", ");
    throw new AppError(
      "server",
      "Unexpected response from server. Please try again.",
      undefined,
      issues,
    );
  }
  // Cast is safe: we just validated data matches the schema which mirrors our TypeScript interface.
  // passthrough() on schemas means extra fields are preserved but don't affect the cast target.
  return result.data as unknown as T;
}
