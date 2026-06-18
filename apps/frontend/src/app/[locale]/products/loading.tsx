// Automatically wraps products/page.tsx in a Suspense boundary.
// Phase 5: replace with <ProductListSkeleton /> once skeleton components exist.
export default function ProductsLoading() {
  return (
    <div
      role="status"
      aria-label="Loading products"
      style={{ padding: "2rem", textAlign: "center" }}
    >
      Loading products…
    </div>
  );
}
