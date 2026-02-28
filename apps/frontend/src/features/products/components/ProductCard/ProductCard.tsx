// src/features/products/components/ProductCard/ProductCard.tsx

'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useState, useCallback } from 'react';
import { useAuthStore } from '@/store/auth.store';
import { useAddToCart } from '@/features/cart/hooks';
import type { Product } from '../../interfaces';
import styles from './ProductCard.module.scss';

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const router = useRouter();
  const status = useAuthStore((state) => state.status);
  const { mutate: addToCart, isPending } = useAddToCart();
  const [buttonState, setButtonState] = useState<'idle' | 'success' | 'error'>('idle');
  const mainImage = product.images.find((img) => img.isMain) || product.images[0];
  const [imageSrc, setImageSrc] = useState(mainImage?.url || null);

  const handleImageError = useCallback(() => {
    setImageSrc(`https://picsum.photos/400/400`);
  }, []);

  const handleAddToCart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (status !== 'authenticated') {
        router.push('/login');
        return;
      }

      addToCart(
        { productId: product.id, quantity: 1 },
        {
          onSuccess: () => {
            setButtonState('success');
            setTimeout(() => setButtonState('idle'), 2000);
          },
          onError: () => {
            setButtonState('error');
            setTimeout(() => setButtonState('idle'), 2000);
          },
        },
      );
    },
    [status, router, addToCart, product.id],
  );

  const price = Number(product.price).toFixed(2);
  const inStock = product.stock > 0;

  const getButtonLabel = (): string => {
    if (isPending) return 'Adding...';
    if (buttonState === 'success') return 'Added ✓';
    if (buttonState === 'error') return 'Failed';
    return 'Add to Cart';
  };

  const isButtonDisabled = !inStock || isPending || buttonState === 'success';

  return (
    <Link href={`/products/${product.slug}`} className={styles.card}>
      <div className={styles.imageWrapper}>
        {imageSrc ? (
          <Image
            src={imageSrc}
            alt={mainImage?.altText || product.name}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            className={styles.image}
            onError={handleImageError}
          />
        ) : (
          <div className={styles.placeholder} />
        )}
      </div>

      <div className={styles.content}>
        <h3 className={styles.name}>{product.name}</h3>

        <div className={styles.price}>${price}</div>

        <div className={inStock ? styles.inStock : styles.outOfStock}>
          {inStock ? `In Stock (${product.stock})` : 'Out of Stock'}
        </div>

        <button
          className={`${styles.addToCart} ${buttonState === 'success' ? styles.addToCartSuccess : ''} ${buttonState === 'error' ? styles.addToCartError : ''}`}
          disabled={isButtonDisabled}
          onClick={handleAddToCart}
        >
          {getButtonLabel()}
        </button>
      </div>
    </Link>
  );
}
