"use client";

import Link from "next/link";
import Image from "next/image";
import { useRecommendations } from "../../hooks/useRecommendations";
import { formatCurrency } from "@/shared/formatters";
import styles from "./RecommendationStrip.module.scss";

interface RecommendationStripProps {
  productId: string;
}

export function RecommendationStrip({ productId }: RecommendationStripProps) {
  const { data, isLoading } = useRecommendations(productId);

  if (isLoading || !data?.length) return null;

  return (
    <section className={styles.section}>
      <h2 className={styles.heading}>You might also like</h2>
      <div className={styles.strip}>
        {data.slice(0, 6).map((product) => (
          <Link
            key={product.id}
            href={`/products/${product.slug}`}
            className={styles.card}
          >
            {product.imageUrl && (
              <div className={styles.imageWrapper}>
                <Image
                  src={product.imageUrl}
                  alt={product.name}
                  fill
                  sizes="140px"
                  className={styles.image}
                />
              </div>
            )}
            <p className={styles.name}>{product.name}</p>
            <p className={styles.price}>{formatCurrency(product.price)}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
