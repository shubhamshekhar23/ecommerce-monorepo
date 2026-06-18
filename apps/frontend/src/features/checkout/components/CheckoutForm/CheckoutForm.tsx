// src/features/checkout/components/CheckoutForm/CheckoutForm.tsx

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useStripe, useElements, CardElement } from '@stripe/react-stripe-js';
import { resolveStripeError } from '../../utils/stripe-errors';
import styles from './CheckoutForm.module.scss';

interface CheckoutFormProps {
  orderId: string;
  amount: number;
  clientSecret: string;
}

// Clear all checkout session data after a confirmed payment so a fresh
// checkout starts clean (new idempotency key, no stale clientSecret).
function clearCheckoutSession(): void {
  try {
    sessionStorage.removeItem('checkout-idempotency-key');
    sessionStorage.removeItem('checkout-order-id');
    sessionStorage.removeItem('checkout-client-secret');
  } catch { /* ignore */ }
}

export function CheckoutForm({ orderId, amount, clientSecret }: CheckoutFormProps) {
  const router = useRouter();
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  const total = Number(amount).toFixed(2);

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();

    if (!stripe || !elements) {
      setError('Payment system not loaded. Please refresh and try again.');
      return;
    }

    setError(null);
    setProcessing(true);

    const cardElement = elements.getElement(CardElement);
    if (!cardElement) {
      setError('Card element not found. Please refresh and try again.');
      setProcessing(false);
      return;
    }

    const { error: confirmError, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
      payment_method: { card: cardElement },
    });

    if (confirmError) {
      setError(resolveStripeError(confirmError));
      setProcessing(false);
      return;
    }

    // Some payment methods (bank debits, certain cards) don't confirm immediately.
    // Redirect to the order page either way — it will show the current status.
    clearCheckoutSession();

    if (paymentIntent?.status === 'processing') {
      router.push(`/orders/${orderId}?payment_processing=1`);
    } else {
      router.push(`/orders/${orderId}`);
    }
  };

  return (
    <div className={styles.form}>
      <div className={styles.summary}>
        <h2 className={styles.title}>Payment Details</h2>
        <div className={styles.amount}>
          <span className={styles.label}>Order Total</span>
          <span className={styles.value}>${total}</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className={styles.formContent}>
        <div className={styles.fieldGroup}>
          <label className={styles.label} htmlFor="card">
            Card Information
          </label>
          <div className={styles.cardElement}>
            <CardElement
              options={{
                style: {
                  base: {
                    fontSize: '16px',
                    fontFamily: 'var(--font-family-base)',
                    color: 'var(--color-text-primary)',
                    '::placeholder': {
                      color: 'var(--color-text-muted)',
                    },
                  },
                  invalid: {
                    color: '#cc0c39',
                  },
                },
              }}
            />
          </div>
        </div>

        {error && <div className={styles.error}>{error}</div>}

        <button
          type="submit"
          className={styles.submitBtn}
          disabled={!stripe || processing}
        >
          {processing ? 'Processing payment…' : `Pay $${total}`}
        </button>
      </form>

      <p className={styles.testInfo}>
        Use test card: <code>4242 4242 4242 4242</code>
      </p>
    </div>
  );
}
