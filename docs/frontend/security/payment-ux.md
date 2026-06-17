# 19 — Payment UX

Payment flows are the highest-stakes part of an ecommerce frontend. Errors here mean lost revenue and user distrust. These patterns prevent the most common failure modes.

---

## Items to Implement

### Double Payment Prevention

- [ ] **Disable submit button immediately on click** — the "Place Order" / "Pay Now" button must be disabled the moment it's clicked and remain disabled until the payment either succeeds or fails definitively. A user clicking twice because the page "felt slow" should never result in two charges.
  
  ```tsx
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const handleSubmit = async () => {
    if (isSubmitting) return; // guard
    setIsSubmitting(true);
    try {
      await placeOrder();
    } finally {
      setIsSubmitting(false); // only re-enable on definitive failure
    }
  };
  ```
  On success, navigate away — the button never re-enables.
  - Complexity: Easy
  - File: `src/features/checkout/components/CheckoutForm/CheckoutForm.tsx`

- [ ] **Idempotency key awareness** — the backend's idempotency interceptor (already built in Phase 9) requires the frontend to send a stable `Idempotency-Key` header per checkout attempt. Generate a UUID when the checkout page loads, persist it in `sessionStorage`, and include it in the payment API call. If the user refreshes and retries, the same key is used — the backend deduplicates.
  ```ts
  const idempotencyKey = sessionStorage.getItem('checkout-key') 
    ?? (() => { const k = crypto.randomUUID(); sessionStorage.setItem('checkout-key', k); return k; })();
  ```
  Clear the key from sessionStorage only after a confirmed successful order.
  - Complexity: Medium
  - File: `src/features/checkout/api/checkout.api.ts`

### Payment State & Recovery

- [ ] **Payment pending state** — Stripe payment can enter a "processing" state where the outcome isn't immediately known. Show a dedicated "Payment processing…" page/state instead of a spinner on the checkout form. Do not allow the user to navigate away or re-submit.
  - Complexity: Medium
  - File: `src/features/checkout/components/CheckoutView/CheckoutView.tsx`

- [ ] **Restore checkout on refresh** — if the user refreshes during checkout (accidental back button, browser crash), they should land back on the checkout page with their cart intact, not lose their progress and start from scratch.
  - Save cart contents and shipping form values to `sessionStorage` as the user fills the form.
  - On mount: re-hydrate from `sessionStorage`.
  - Clear on successful order placement.
  - Complexity: Medium
  - File: `src/features/checkout/components/CheckoutForm/CheckoutForm.tsx`

- [ ] **Resume interrupted checkout** — if the user navigated away mid-checkout (went to look at their cart, then came back), the Stripe `clientSecret` from the previous session may still be valid. Check if a `clientSecret` exists in `sessionStorage` before requesting a new one. Avoids creating duplicate payment intents.
  - Complexity: Medium
  - File: `src/features/checkout/hooks/useGetClientSecret.ts`

### Error Handling in Payment

- [ ] **Payment failure UI** — Stripe can fail for many reasons: card declined, insufficient funds, 3D Secure failure, network timeout. Each needs a distinct, actionable error message:
  - Card declined → "Your card was declined. Please try a different card."
  - 3D Secure failed → "Payment authentication failed. Please try again."
  - Network error → "We couldn't reach the payment provider. Please check your connection and retry."
  - Generic → "Payment failed. Your card has not been charged."
  
  Map Stripe error codes to user-friendly messages in `features/checkout/utils/`.
  - Complexity: Medium

- [ ] **Never show raw error strings to users** — Stripe and API error messages can contain technical jargon. Always map to human-readable text before displaying.
  - Complexity: Easy (audit + create error message mapping)

### Order Confirmation

- [ ] **Clear cart and idempotency key on successful order** — after a confirmed order:
  1. Clear the checkout `sessionStorage` key
  2. Invalidate the cart query (`queryClient.invalidateQueries(['cart'])`)
  3. Navigate to `/orders/[id]` confirmation page
  - Complexity: Easy
  - File: `src/features/checkout/hooks/` (in mutation `onSuccess`)
