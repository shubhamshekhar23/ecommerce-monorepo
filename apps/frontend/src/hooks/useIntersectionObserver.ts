"use client";

import { useEffect, useRef, useState } from "react";

interface Options extends IntersectionObserverInit {
  once?: boolean;
}

export function useIntersectionObserver<T extends Element>(
  options: Options = {},
) {
  const { once = false, root, rootMargin, threshold } = options;
  const ref = useRef<T>(null);
  const [isIntersecting, setIsIntersecting] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsIntersecting(entry.isIntersecting);
        if (once && entry.isIntersecting) {
          observer.disconnect();
        }
      },
      { root, rootMargin, threshold },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [once, root, rootMargin, threshold]);

  return { ref, isIntersecting };
}
