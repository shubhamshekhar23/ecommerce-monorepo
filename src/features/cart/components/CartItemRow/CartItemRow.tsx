// src/features/cart/components/CartItemRow/CartItemRow.tsx

'use client';

import Link from 'next/link';
import type { CartItem } from '../../interfaces';
import { useUpdateCartItem, useRemoveCartItem } from '../../hooks';
import styles from './CartItemRow.module.scss';

interface CartItemRowProps {
  item: CartItem;
}

export function CartItemRow({ item }: CartItemRowProps) {
  const { mutate: updateItem, isPending: isUpdating } = useUpdateCartItem();
  const { mutate: removeItem, isPending: isRemoving } = useRemoveCartItem();

  const price = Number(item.product.price).toFixed(2);
  const subtotal = Number(item.subtotal).toFixed(2);

  const handleDecrement = (): void => {
    if (item.quantity <= 1) return;
    updateItem({ itemId: item.id, quantity: item.quantity - 1 });
  };

  const handleIncrement = (): void => {
    if (item.quantity >= item.product.stock) return;
    updateItem({ itemId: item.id, quantity: item.quantity + 1 });
  };

  const handleRemove = (): void => {
    removeItem(item.id);
  };

  const isDisabled = isUpdating || isRemoving;

  return (
    <div className={styles.row}>
      <div className={styles.imageWrapper}>
        <div className={styles.placeholder}>
          {item.product.name.charAt(0).toUpperCase()}
        </div>
      </div>

      <div className={styles.details}>
        <Link href={`/products/${item.product.slug}`} className={styles.name}>
          {item.product.name}
        </Link>
        <div className={styles.unitPrice}>${price} each</div>
      </div>

      <div className={styles.quantityControl}>
        <button
          className={styles.qtyBtn}
          onClick={handleDecrement}
          disabled={isDisabled || item.quantity <= 1}
          aria-label="Decrease quantity"
        >
          -
        </button>
        <span className={styles.qty}>{item.quantity}</span>
        <button
          className={styles.qtyBtn}
          onClick={handleIncrement}
          disabled={isDisabled || item.quantity >= item.product.stock}
          aria-label="Increase quantity"
        >
          +
        </button>
      </div>

      <div className={styles.subtotal}>${subtotal}</div>

      <button
        className={styles.removeBtn}
        onClick={handleRemove}
        disabled={isDisabled}
        aria-label={`Remove ${item.product.name} from cart`}
      >
        {isRemoving ? '...' : 'Remove'}
      </button>
    </div>
  );
}
