"use client";

import { useEffect, useMemo, useRef } from "react";

export function useDebouncedCallback<A extends unknown[]>(fn: (...args: A) => void, delay = 500) {
  const fnRef = useRef(fn);
  useEffect(() => {
    fnRef.current = fn;
  });
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  return useMemo(() => {
    const debounced = (...args: A) => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => fnRef.current(...args), delay);
    };
    debounced.flush = (...args: A) => {
      if (timer.current) clearTimeout(timer.current);
      fnRef.current(...args);
    };
    return debounced;
  }, [delay]);
}
