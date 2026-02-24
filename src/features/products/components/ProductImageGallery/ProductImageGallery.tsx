// src/features/products/components/ProductImageGallery/ProductImageGallery.tsx

'use client';

import { useState } from 'react';
import Image from 'next/image';
import type { ProductImage } from '../../interfaces';
import styles from './ProductImageGallery.module.scss';

interface ProductImageGalleryProps {
  images: ProductImage[];
  productName: string;
}

export function ProductImageGallery({
  images,
  productName,
}: ProductImageGalleryProps) {
  const mainImageIndex = images.findIndex((img) => img.isMain);
  const [selectedIndex, setSelectedIndex] = useState(mainImageIndex >= 0 ? mainImageIndex : 0);

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
          src={selectedImage.url}
          alt={selectedImage.altText || productName}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 40vw"
          className={styles.mainImage}
        />
      </div>

      {images.length > 1 && (
        <div className={styles.thumbnails}>
          {images.map((image, idx) => (
            <button
              key={image.id || idx}
              className={`${styles.thumbnail} ${
                idx === selectedIndex ? styles.active : ''
              }`}
              onClick={() => setSelectedIndex(idx)}
              aria-label={`View image ${idx + 1}`}
            >
              <Image
                src={image.url}
                alt={image.altText || `${productName} image ${idx + 1}`}
                fill
                sizes="64px"
                className={styles.thumbnailImage}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
