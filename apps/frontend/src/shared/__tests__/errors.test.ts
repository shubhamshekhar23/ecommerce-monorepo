import { AppError } from "../errors";
import type { ErrorCategory } from "../errors";

describe("AppError", () => {
  it('sets name to "AppError"', () => {
    const err = new AppError("network", "Connection failed");
    expect(err.name).toBe("AppError");
  });

  it("sets message to userMessage", () => {
    const err = new AppError("validation", "Invalid email");
    expect(err.message).toBe("Invalid email");
    expect(err.userMessage).toBe("Invalid email");
  });

  it("stores the error category", () => {
    const categories: ErrorCategory[] = [
      "validation",
      "business",
      "auth",
      "network",
      "server",
      "unknown",
    ];
    for (const category of categories) {
      const err = new AppError(category, "msg");
      expect(err.category).toBe(category);
    }
  });

  it("stores an optional statusCode", () => {
    const err = new AppError("auth", "Unauthorized", 401);
    expect(err.statusCode).toBe(401);
  });

  it("stores an optional originalError", () => {
    const original = new Error("raw error");
    const err = new AppError("server", "Something went wrong", 500, original);
    expect(err.originalError).toBe(original);
  });

  it("omits statusCode and originalError when not provided", () => {
    const err = new AppError("unknown", "Unknown error");
    expect(err.statusCode).toBeUndefined();
    expect(err.originalError).toBeUndefined();
  });

  it("is an instance of Error", () => {
    const err = new AppError("network", "Connection failed");
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(AppError);
  });
});
