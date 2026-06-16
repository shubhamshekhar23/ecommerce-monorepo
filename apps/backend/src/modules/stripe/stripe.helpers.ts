import Stripe from 'stripe';

/*
 - Card-specific and auth errors are non-retriable — retrying will not fix a declined card.
 - Network errors, rate limits, and Stripe 5xx errors are transient and worth retrying.
 - Unknown errors (not from Stripe SDK) are treated as retriable by default.
 */
export function isRetriableStripeError(error: unknown): boolean {
  if (!(error instanceof Stripe.errors.StripeError)) return true;
  if (error instanceof Stripe.errors.StripeCardError) return false;
  if (error instanceof Stripe.errors.StripeInvalidRequestError) return false;
  if (error instanceof Stripe.errors.StripeAuthenticationError) return false;
  if (error instanceof Stripe.errors.StripePermissionError) return false;
  return true;
}
