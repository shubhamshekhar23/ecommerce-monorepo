import type { Stripe } from "@stripe/stripe-js";
import { env } from "@/shared/config/env";

// Lazily resolve on first call so the Stripe SDK is not included in the initial
// JS bundle — it is only fetched when the checkout page actually renders.
let stripePromise: Promise<Stripe | null> | null = null;

export function getStripe(): Promise<Stripe | null> {
  if (!stripePromise) {
    stripePromise = import("@stripe/stripe-js").then(({ loadStripe }) =>
      loadStripe(env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY),
    );
  }
  return stripePromise;
}
