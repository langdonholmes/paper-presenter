import { useState, useEffect, useCallback } from "react";

export function clampedNav(index: number, delta: number, length: number): number {
  if (length === 0) return 0;
  return Math.max(0, Math.min(length - 1, index + delta));
}

export function useKeyboardNav(length: number) {
  const [index, setIndex] = useState(0);

  const next = useCallback(
    () => setIndex((i) => clampedNav(i, 1, length)),
    [length],
  );
  const prev = useCallback(
    () => setIndex((i) => clampedNav(i, -1, length)),
    [length],
  );

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        e.preventDefault();
        next();
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        prev();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [next, prev]);

  return { index, setIndex, next, prev };
}
