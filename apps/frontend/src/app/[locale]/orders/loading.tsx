// Phase 5: replace with <OrderListSkeleton /> once skeleton components exist.
export default function OrdersLoading() {
  return (
    <div
      role="status"
      aria-label="Loading orders"
      style={{ padding: "2rem", textAlign: "center" }}
    >
      Loading orders…
    </div>
  );
}
