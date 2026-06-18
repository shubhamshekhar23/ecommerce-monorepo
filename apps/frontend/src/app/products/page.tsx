// src/app/products/page.tsx

import { Suspense } from "react";
import { ProductsView } from "@/features/products";
import styles from "./page.module.scss";

// Serve the cached static page; regenerate in the background when older than 60s.
// Product listings don't need to be real-time — a 1-minute window is imperceptible.
export const revalidate = 60;

export const metadata = {
  title: "Products | ShopHub",
  description: "Browse our collection of products.",
  alternates: {
    canonical: `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/products`,
  },
};

function ProductsLoading() {
  return (
    <div className={styles.loadingState} role="status" aria-live="polite">
      <span className={styles.spinner} aria-hidden="true" />
      <p className={styles.loadingText}>Loading products...</p>
    </div>
  );
}

export default function ProductsPage() {
  return (
    <Suspense fallback={<ProductsLoading />}>
      <ProductsView />
    </Suspense>
  );
}
