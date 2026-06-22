// Runs in a dedicated Web Worker — no DOM, no React, no TanStack Query.
// Receives CartItem[] via postMessage and replies with computed totals.
// The main thread's optimistic-update mutations continue using the synchronous
// recalcCartTotals() from cart.normalize.ts — this worker is for display totals
// in CartSummary where a one-tick async delay is imperceptible.

interface WorkerCartItem {
  subtotal: number;
}

interface TotalsResult {
  itemCount: number;
  totalPrice: number;
}

self.onmessage = (event: MessageEvent<WorkerCartItem[]>) => {
  const items = event.data;
  const result: TotalsResult = {
    itemCount: items.length,
    totalPrice: items.reduce((sum, item) => sum + item.subtotal, 0),
  };
   
  postMessage(result);
};
