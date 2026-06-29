// src/features/products/components/ProductImageGallery/ProductImageGallery.tsx

"use client";

import { useState } from "react";
import Image from "next/image";
import { BLUR_PLACEHOLDER } from "@/shared/imagePlaceholder";
import { useImageQuality } from "@/hooks/useConnectionQuality";
import { buildImageUrl } from "@/shared/buildImageUrl";
import type { ProductImage } from "../../interfaces";
import styles from "./ProductImageGallery.module.scss";

interface ProductImageGalleryProps {
  images: ProductImage[];
  productName: string;
}

export function ProductImageGallery({
  images,
  productName,
}: ProductImageGalleryProps) {
  const imageQuality = useImageQuality();
  const mainImageIndex = images.findIndex((img) => img.isMain);
  const [selectedIndex, setSelectedIndex] = useState(
    mainImageIndex >= 0 ? mainImageIndex : 0,
  );

  const selectedImage = images[selectedIndex];

  if (!selectedImage) {
    return (
      <div className={styles.gallery}>
        <div className={styles.mainImageWrapper}>
          <div className={styles.placeholder}>
            {productName.charAt(0).toUpperCase()}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.gallery}>
      <div className={styles.mainImageWrapper}>
        <Image
          src={buildImageUrl(selectedImage.url, { quality: imageQuality })}
          alt={selectedImage.altText || productName}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 40vw"
          className={styles.mainImage}
          priority
          quality={imageQuality}
          placeholder="blur"
          blurDataURL={BLUR_PLACEHOLDER}
        />
      </div>

      {images.length > 1 && (
        <div className={styles.thumbnails}>
          {images.map((image, idx) => (
            <button
              key={image.id || idx}
              className={`${styles.thumbnail} ${
                idx === selectedIndex ? styles.active : ""
              }`}
              onClick={() => setSelectedIndex(idx)}
              aria-label={`View image ${idx + 1}`}
            >
              <Image
                src={buildImageUrl(image.url)}
                alt={image.altText || `${productName} image ${idx + 1}`}
                fill
                sizes="64px"
                className={styles.thumbnailImage}
                placeholder="blur"
                blurDataURL={BLUR_PLACEHOLDER}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
