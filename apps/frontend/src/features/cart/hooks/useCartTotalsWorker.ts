"use client";

import { useEffect, useRef, useState } from "react";
import type { CartItem } from "../interfaces";

interface CartTotals {
  itemCount: number;
  totalPrice: number;
}

/**
 * Offloads cart total computation to a dedicated Web Worker.
 * Returns null on the first tick (before the worker responds); CartSummary
 * falls back to the backend-provided cart.totalPrice during that window.
 *
 * The worker is created once on mount and terminated on unmount.
 * Sending items is non-blocking: the worker processes them off the main thread.
 */
export function useCartTotalsWorker(items: CartItem[]): CartTotals | null {
  const workerRef = useRef<Worker | null>(null);
  const [totals, setTotals] = useState<CartTotals | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    workerRef.current = new Worker(
      new URL("../../../workers/cartTotals.worker.ts", import.meta.url),
    );

    workerRef.current.onmessage = (e: MessageEvent<CartTotals>) => {
      setTotals(e.data);
    };

    return () => {
      workerRef.current?.terminate();
      workerRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!workerRef.current) return;
    workerRef.current.postMessage(items);
  }, [items]);

  return totals;
}
