"use client";

import { useEffect, useState } from "react";

// Mirror the breakpoints in ProductGrid.module.scss
function computeColumns(width: number): number {
  if (width <= 640) return 1;
  if (width <= 900) return 2;
  if (width <= 1280) return 3;
  return 4;
}

/**
 * Returns the number of product grid columns at the current viewport width.
 * Updates on resize so the virtualizer row grouping stays in sync.
 */
export function useColumnCount(): number {
  const [columns, setColumns] = useState(() =>
    typeof window !== "undefined" ? computeColumns(window.innerWidth) : 4,
  );

  useEffect(() => {
    const update = () => setColumns(computeColumns(window.innerWidth));
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  return columns;
}
