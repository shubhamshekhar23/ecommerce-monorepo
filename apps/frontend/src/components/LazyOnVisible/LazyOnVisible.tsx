"use client";

import { Suspense, type ReactNode } from "react";
import { useIntersectionObserver } from "@/hooks/useIntersectionObserver";

interface LazyOnVisibleProps {
  children: ReactNode;
  fallback: ReactNode;
  rootMargin?: string;
}

export function LazyOnVisible({
  children,
  fallback,
  rootMargin = "200px",
}: LazyOnVisibleProps) {
  const { ref, isIntersecting } = useIntersectionObserver<HTMLDivElement>({
    once: true,
    rootMargin,
  });

  return (
    <div ref={ref}>
      {isIntersecting ? (
        <Suspense fallback={fallback}>{children}</Suspense>
      ) : (
        fallback
      )}
    </div>
  );
}
