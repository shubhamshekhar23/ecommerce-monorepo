"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, useCallback } from "react";
import { useAuthStore } from "@/store/auth.store";
import { useAddToCart } from "@/features/cart/hooks";
import { BLUR_PLACEHOLDER } from "@/shared/imagePlaceholder";
import { useImageQuality } from "@/hooks/useConnectionQuality";
import { buildImageUrl } from "@/shared/buildImageUrl";
import type { Product } from "../../interfaces";
import { highlightMatch } from "@/shared/utils/highlightMatch";
import { WishlistButton } from "../WishlistButton/WishlistButton";
import styles from "./ProductCard.module.scss";

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
const PAGE_LOAD_TIME = Date.now();

interface ProductCardProps {
  product: Product;
  priority?: boolean;
  searchQuery?: string;
}

function ProductCardComponent({
  product,
  priority = false,
  searchQuery,
}: ProductCardProps) {
  const router = useRouter();
  const status = useAuthStore((state) => state.status);
  const { mutate: addToCart, isPending } = useAddToCart();
  const imageQuality = useImageQuality();
  const [buttonState, setButtonState] = useState<"idle" | "success" | "error">(
    "idle",
  );

  const mainImage =
    product.images.find((img) => img.isMain) || product.images[0];
  const [imageSrc, setImageSrc] = useState(
    mainImage?.url
      ? buildImageUrl(mainImage.url, { quality: imageQuality })
      : null,
  );

  const handleImageError = useCallback(() => {
    setImageSrc(`https://picsum.photos/400/400`);
  }, []);

  const handleAddToCart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (status !== "authenticated") {
        router.push("/login");
        return;
      }

      addToCart(
        { productId: product.id, quantity: 1 },
        {
          onSuccess: () => {
            setButtonState("success");
            setTimeout(() => setButtonState("idle"), 2000);
          },
          onError: () => {
            setButtonState("error");
            setTimeout(() => setButtonState("idle"), 2000);
          },
        },
      );
    },
    [status, router, addToCart, product.id],
  );

  // cursor API returns priceRange.min; paginated API returns flat price
  const rawPrice =
    product.price ??
    (product as { priceRange?: { min: number } }).priceRange?.min;
  const price = rawPrice !== undefined ? Number(rawPrice).toFixed(2) : "—";
  // cursor API has no flat stock field; undefined → treat as in-stock
  const inStock = product.stock === undefined ? true : product.stock > 0;

  const isNew = product.createdAt
    ? PAGE_LOAD_TIME - new Date(product.createdAt).getTime() < THIRTY_DAYS_MS
    : false;

  const addBtnLabel =
    buttonState === "success" ? "✓" : buttonState === "error" ? "!" : "+";

  return (
    <Link href={`/products/${product.slug}`} className={styles.card}>
      <div className={styles.imageWrapper}>
        {isNew && <span className={styles.badge}>New</span>}
        <div className={styles.wishlist}>
          <WishlistButton productId={product.id} />
        </div>
        {imageSrc ? (
          <Image
            src={imageSrc}
            alt={mainImage?.altText || product.name}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className={styles.image}
            priority={priority}
            quality={imageQuality}
            placeholder="blur"
            blurDataURL={BLUR_PLACEHOLDER}
            onError={handleImageError}
          />
        ) : (
          <div className={styles.placeholder} />
        )}
      </div>

      <div className={styles.content}>
        {product.categoryName && (
          <span className={styles.category}>{product.categoryName}</span>
        )}
        <h3 className={styles.name}>
          {searchQuery
            ? highlightMatch(product.name, searchQuery)
            : product.name}
        </h3>
        <div className={styles.priceRow}>
          <span className={styles.price}>${price}</span>
          <button
            className={`${styles.addBtn} ${
              buttonState === "success" ? styles.addBtnSuccess : ""
            } ${buttonState === "error" ? styles.addBtnError : ""}`}
            disabled={!inStock || isPending || buttonState === "success"}
            onClick={handleAddToCart}
            title={inStock ? "Add to cart" : "Out of stock"}
            aria-label={`Add ${product.name} to cart`}
          >
            {addBtnLabel}
          </button>
        </div>
      </div>
    </Link>
  );
}

export const ProductCard = React.memo(ProductCardComponent);
