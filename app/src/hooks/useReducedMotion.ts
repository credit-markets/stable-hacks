import { useEffect, useState } from "react";

/**
 * Hook that detects if the user has requested reduced motion.
 * Respects the prefers-reduced-motion media query for accessibility.
 *
 * @returns true if reduced motion is preferred, false otherwise
 *
 * @example
 * ```tsx
 * const prefersReducedMotion = useReducedMotion();
 *
 * const chartOptions = {
 *   animations: {
 *     enabled: !prefersReducedMotion,
 *     speed: prefersReducedMotion ? 0 : 300,
 *   }
 * };
 * ```
 */
export function useReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mediaQuery.matches);

    const handler = () => setPrefersReducedMotion(mediaQuery.matches);
    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, []);

  return prefersReducedMotion;
}
