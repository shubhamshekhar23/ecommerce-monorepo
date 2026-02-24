// src/features/checkout/components/CheckoutView/CheckoutView.tsx

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Elements } from '@stripe/react-stripe-js';
import { stripePromise } from '@/lib/stripe';
import { useCart } from '@/features/cart/hooks';
import { useCreateOrder } from '@/features/orders/hooks';
import { useGetClientSecret } from '../../hooks';
import { CheckoutForm } from '../CheckoutForm/CheckoutForm';
import styles from './CheckoutView.module.scss';

type Stage = 'review' | 'payment' | 'success';

export function CheckoutView() {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>('review');
  const [orderId, setOrderId] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);

  const { data: cart, isLoading: cartLoading } = useCart();
  const { mutate: createOrder, isPending: isCreatingOrder } = useCreateOrder();
  const { mutate: getClientSecret, isPending: isGettingSecret } = useGetClientSecret();

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
          <a href="/products" className={styles.linkBtn}>Continue Shopping</a>
        </div>
      </div>
    );
  }

  const handlePlaceOrder = (): void => {
    createOrder(undefined, {
      onSuccess: (order) => {
        setOrderId(order.id);
        getClientSecret(order.id, {
          onSuccess: (response) => {
            setClientSecret(response.clientSecret);
            setStage('payment');
          },
          onError: () => {
            setStage('review');
          },
        });
      },
    });
  };

  const total = Number(cart.totalPrice).toFixed(2);
  const itemLabel = cart.itemCount === 1 ? '1 item' : `${cart.itemCount} items`;

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
          </div>

          <button
            className={styles.placeOrderBtn}
            onClick={handlePlaceOrder}
            disabled={isCreatingOrder || isGettingSecret}
          >
            {isCreatingOrder || isGettingSecret ? 'Processing...' : 'Place Order & Pay'}
          </button>
        </div>
      )}

      {stage === 'payment' && clientSecret && orderId && (
        <Elements stripe={stripePromise} options={{ clientSecret }}>
          <CheckoutForm orderId={orderId} amount={cart.totalPrice} clientSecret={clientSecret} />
        </Elements>
      )}

      {stage === 'success' && (
        <div className={styles.successMessage}>
          <p>Payment processing... Redirecting to your orders.</p>
        </div>
      )}
    </div>
  );
}
