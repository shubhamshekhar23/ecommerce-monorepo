'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Elements } from '@stripe/react-stripe-js';
import { stripePromise } from '@/lib/stripe';
import { useCart } from '@/features/cart/hooks';
import { useCreateOrder } from '@/features/orders/hooks';
import { useGetClientSecret } from '../../hooks';
import { CheckoutForm } from '../CheckoutForm/CheckoutForm';
import { AppError } from '@/shared/errors';
import styles from './CheckoutView.module.scss';

const SESSION_ORDER_ID = 'checkout-order-id';
const SESSION_CLIENT_SECRET = 'checkout-client-secret';

type Stage = 'review' | 'payment';

function resolveOrderError(error: unknown): string {
  if (!(error instanceof AppError)) return 'Something went wrong. Please try again.';

  if (error.statusCode === 503) {
    return 'Payment service is temporarily unavailable. Please try again in a few minutes.';
  }
  if (error.statusCode === 409) {
    return 'Your order is still being processed — please wait a moment before retrying.';
  }
  if (error.statusCode === 429) {
    return 'Too many orders placed recently. Please wait a while before trying again.';
  }
  return error.userMessage || 'Failed to place order. Please try again.';
}

export function CheckoutView() {
  const [stage, setStage] = useState<Stage>('review');
  const [orderId, setOrderId] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [orderError, setOrderError] = useState<string | null>(null);

  const { data: cart, isLoading: cartLoading } = useCart();
  const { mutate: createOrder, isPending: isCreatingOrder } = useCreateOrder();
  const { mutate: getClientSecret, isPending: isGettingSecret } = useGetClientSecret();

  // Resume an interrupted checkout: if the user refreshed mid-payment, the
  // clientSecret is still valid — skip directly to the Stripe form.
  useEffect(() => {
    try {
      const savedOrderId = sessionStorage.getItem(SESSION_ORDER_ID);
      const savedClientSecret = sessionStorage.getItem(SESSION_CLIENT_SECRET);
      if (savedOrderId && savedClientSecret) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setOrderId(savedOrderId);
        setClientSecret(savedClientSecret);
        setStage('payment');
      }
    } catch {
      // sessionStorage blocked
    }
  }, []);

  if (cartLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingMessage}>Loading checkout...</div>
      </div>
    );
  }

  if (!cart || cart.items.length === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.errorMessage}>
          <p>Your cart is empty.</p>
          <Link href="/products" className={styles.linkBtn}>Continue Shopping</Link>
        </div>
      </div>
    );
  }

  const handlePlaceOrder = (): void => {
    setOrderError(null);

    createOrder(undefined, {
      onSuccess: (order) => {
        setOrderId(order.id);
        getClientSecret(order.id, {
          onSuccess: (response) => {
            // Persist so a page refresh can resume without creating a new payment intent.
            try {
              sessionStorage.setItem(SESSION_ORDER_ID, order.id);
              sessionStorage.setItem(SESSION_CLIENT_SECRET, response.clientSecret);
            } catch { /* ignore */ }

            setClientSecret(response.clientSecret);
            setStage('payment');
          },
          onError: () => setStage('review'),
        });
      },
      onError: (error) => {
        setOrderError(resolveOrderError(error));
      },
    });
  };

  const total = Number(cart.totalPrice).toFixed(2);
  const itemLabel = cart.itemCount === 1 ? '1 item' : `${cart.itemCount} items`;
  const isProcessing = isCreatingOrder || isGettingSecret;

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Checkout</h1>

      {stage === 'review' && (
        <div className={styles.reviewSection}>
          <div className={styles.content}>
            <h2 className={styles.sectionTitle}>Order Review</h2>

            <div className={styles.itemsList}>
              {cart.items.map((item) => (
                <div key={item.id} className={styles.itemRow}>
                  <div className={styles.itemInfo}>
                    <p className={styles.itemName}>{item.product.name}</p>
                    <p className={styles.itemQty}>Qty: {item.quantity}</p>
                  </div>
                  <div className={styles.itemPrice}>${Number(item.product.price).toFixed(2)}</div>
                  <div className={styles.itemSubtotal}>
                    ${Number(item.subtotal).toFixed(2)}
                  </div>
                </div>
              ))}
            </div>

            <div className={styles.summaryBox}>
              <div className={styles.summaryRow}>
                <span className={styles.summaryLabel}>Items ({itemLabel})</span>
                <span className={styles.summaryValue}>${total}</span>
              </div>
              <div className={`${styles.summaryRow} ${styles.totalRow}`}>
                <span className={styles.totalLabel}>Order Total</span>
                <span className={styles.totalValue}>${total}</span>
              </div>
            </div>

            {orderError && (
              <p className={styles.orderError}>{orderError}</p>
            )}
          </div>

          <button
            className={styles.placeOrderBtn}
            onClick={handlePlaceOrder}
            disabled={isProcessing}
          >
            {isProcessing ? 'Processing…' : 'Place Order & Pay'}
          </button>
        </div>
      )}

      {stage === 'payment' && clientSecret && orderId && (
        <Elements stripe={stripePromise} options={{ clientSecret }}>
          <CheckoutForm orderId={orderId} amount={cart.totalPrice} clientSecret={clientSecret} />
        </Elements>
      )}
    </div>
  );
}
