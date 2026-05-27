'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useCallback } from 'react';
import { useAuthStore } from '@/store/auth.store';
import { useAddToCart } from '@/features/cart/hooks';
import { useProduct } from '../../hooks';
import { ProductImageGallery } from '../ProductImageGallery/ProductImageGallery';
import { VariantSelector } from '../VariantSelector/VariantSelector';
import type { ProductVariant } from '../../interfaces';
import styles from './ProductDetailView.module.scss';

interface ProductDetailViewProps {
  slug: string;
}

export function ProductDetailView({ slug }: ProductDetailViewProps) {
  const { data: product, isLoading, error } = useProduct(slug);
  const router = useRouter();
  const status = useAuthStore((state) => state.status);
  const { mutate: addToCart, isPending } = useAddToCart();
  const [buttonState, setButtonState] = useState<'idle' | 'success' | 'error'>('idle');

  // Variant selection state — null until a complete combination is chosen
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [isVariantFullySelected, setIsVariantFullySelected] = useState(false);

  const handleVariantChange = useCallback(
    (variant: ProductVariant | null, isFullySelected: boolean) => {
      setSelectedVariant(variant);
      setIsVariantFullySelected(isFullySelected);
    },
    [],
  );

  const handleAddToCart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      if (!product) return;
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
    [product, status, router, addToCart],
  );

  const getButtonLabel = (): string => {
    if (isPending) return 'Adding...';
    if (buttonState === 'success') return 'Added ✓';
    if (buttonState === 'error') return 'Failed';
    const hasVariants = (product?.variants?.length ?? 0) > 0;
    if (hasVariants && !isVariantFullySelected) return 'Select options';
    return 'Add to Cart';
  };

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.skeleton} />
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className={styles.error}>
        <h1>Product not found</h1>
        <p>This product does not exist or has been removed.</p>
        <Link href="/products">← Back to products</Link>
      </div>
    );
  }

  const hasVariants = (product.variants?.length ?? 0) > 0;

  // When a variant is selected show its values; otherwise fall back to the base product.
  const displayPrice = Number(selectedVariant?.price ?? product.price).toFixed(2);
  const displayStock = selectedVariant ? selectedVariant.stock : (hasVariants ? null : product.stock);

  // null means "variants exist but none selected yet" — show a prompt instead of a count
  const inStock = displayStock !== null && displayStock > 0;
  const isButtonDisabled =
    isPending ||
    buttonState === 'success' ||
    (hasVariants && (!isVariantFullySelected || !selectedVariant)) ||
    (!hasVariants && !inStock);

  const galleryImages =
    selectedVariant?.images && selectedVariant.images.length > 0
      ? selectedVariant.images.map((img) => ({
          id: img.id,
          url: img.url,
          altText: img.altText,
          isMain: img.isMain,
          order: img.order,
        }))
      : product.images;

  return (
    <div className={styles.container}>
      <div className={styles.breadcrumb}>
        <Link href="/">Home</Link>
        <span>{' > '}</span>
        <Link href="/products">Products</Link>
        <span>{' > '}</span>
        <span>{product.name}</span>
      </div>

      <div className={styles.content}>
        <div className={styles.gallery}>
          <ProductImageGallery images={galleryImages} productName={product.name} />
        </div>

        <div className={styles.info}>
          <p className={styles.kicker}>Signature Pick</p>
          <h1 className={styles.name}>{product.name}</h1>

          <div className={styles.priceWrap}>
            <div className={styles.price}>${displayPrice}</div>
            <p className={styles.priceNote}>Inclusive of all taxes</p>
          </div>

          {/* Stock badge — adapts to variant selection state */}
          {displayStock === null ? (
            <div className={styles.selectOptions}>Select options to see availability</div>
          ) : inStock ? (
            <div className={styles.inStock}>
              <span className={styles.badge}>✓</span>
              In Stock ({displayStock} available)
            </div>
          ) : (
            <div className={styles.outOfStock}>
              <span className={styles.badge}>✗</span>
              Out of Stock
            </div>
          )}

          {/* Variant selector — only rendered when the product has variants */}
          {hasVariants && (
            <div className={styles.section}>
              <VariantSelector variants={product.variants} onVariantChange={handleVariantChange} />
            </div>
          )}

          {selectedVariant && (
            <p className={styles.sku}>SKU: {selectedVariant.sku}</p>
          )}

          <div className={styles.quickPoints}>
            <p className={styles.point}>Ready to ship in 24 hours</p>
            <p className={styles.point}>Secure checkout with Stripe</p>
            <p className={styles.point}>Easy returns within 7 days</p>
          </div>

          {product.description && (
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>About this item</h3>
              <p className={styles.description}>{product.description}</p>
            </div>
          )}

          <button
            className={`${styles.addToCart} ${buttonState === 'success' ? styles.addToCartSuccess : ''} ${buttonState === 'error' ? styles.addToCartError : ''}`}
            disabled={isButtonDisabled}
            onClick={handleAddToCart}
          >
            {getButtonLabel()}
          </button>

          {product.category && (
            <div className={styles.section}>
              <p className={styles.category}>
                Category <strong>{product.category.name}</strong>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
