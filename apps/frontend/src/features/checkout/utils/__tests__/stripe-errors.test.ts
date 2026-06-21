import { resolveStripeError } from "../stripe-errors";

describe("resolveStripeError", () => {
  it("maps card_declined to a user-friendly message", () => {
    expect(resolveStripeError({ code: "card_declined" })).toBe(
      "Your card was declined. Please try a different card.",
    );
  });

  it("maps insufficient_funds correctly", () => {
    expect(resolveStripeError({ code: "insufficient_funds" })).toBe(
      "Insufficient funds on this card. Please try a different card.",
    );
  });

  it("maps expired_card correctly", () => {
    expect(resolveStripeError({ code: "expired_card" })).toBe(
      "Your card has expired. Please use a different card.",
    );
  });

  it("maps incorrect_cvc correctly", () => {
    expect(resolveStripeError({ code: "incorrect_cvc" })).toBe(
      "Incorrect security code. Please check and try again.",
    );
  });

  it("maps processing_error correctly", () => {
    expect(resolveStripeError({ code: "processing_error" })).toBe(
      "A processing error occurred. Please try again in a moment.",
    );
  });

  it("maps network_failure correctly", () => {
    expect(resolveStripeError({ code: "network_failure" })).toBe(
      "We couldn't reach the payment provider. Check your connection and retry.",
    );
  });

  it("falls back to message when code is unknown", () => {
    expect(
      resolveStripeError({
        code: "some_unknown_code",
        message: "Raw error from Stripe",
      }),
    ).toBe("Raw error from Stripe");
  });

  it("falls back to generic message when neither code nor message is known", () => {
    expect(resolveStripeError({})).toBe(
      "Payment failed. Your card has not been charged.",
    );
  });

  it("prefers code mapping over message when code is known", () => {
    expect(
      resolveStripeError({
        code: "card_declined",
        message: "Card was declined by issuer",
      }),
    ).toBe("Your card was declined. Please try a different card.");
  });
});
