// Phase 5: replace with <CartSkeleton /> once skeleton components exist.
export default function CartLoading() {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading cart"
      style={{ padding: "2rem", textAlign: "center" }}
    >
      Loading cart…
    </div>
  );
}
