// Maps Stripe error codes to user-facing messages.
// Never show raw Stripe messages — they contain technical jargon.
const STRIPE_ERROR_MAP: Partial<Record<string, string>> = {
  card_declined: "Your card was declined. Please try a different card.",
  insufficient_funds:
    "Insufficient funds on this card. Please try a different card.",
  expired_card: "Your card has expired. Please use a different card.",
  incorrect_cvc: "Incorrect security code. Please check and try again.",
  incorrect_number:
    "Your card number is incorrect. Please check and try again.",
  processing_error:
    "A processing error occurred. Please try again in a moment.",
  authentication_required:
    "Your bank requires additional authentication. Please try again.",
  payment_intent_authentication_failure:
    "Payment authentication failed. Please try again.",
  network_failure:
    "We couldn't reach the payment provider. Check your connection and retry.",
};

export function resolveStripeError(error: {
  code?: string;
  message?: string;
}): string {
  if (error.code && STRIPE_ERROR_MAP[error.code]) {
    return STRIPE_ERROR_MAP[error.code]!;
  }
  return error.message || "Payment failed. Your card has not been charged.";
}
