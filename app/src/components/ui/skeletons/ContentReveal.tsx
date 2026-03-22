"use client";

import { useReducedMotion } from "@/hooks/useReducedMotion";
import { motion } from "framer-motion";
import type { ReactNode } from "react";

type RevealVariant = "fade-in" | "fade-up" | "none";

interface ContentRevealProps {
  children: ReactNode;
  /** Animation variant. Defaults to "fade-up" */
  variant?: RevealVariant;
  /** Delay in seconds before animation starts. Defaults to 0 */
  delay?: number;
  /** Duration in seconds. Defaults to 0.3 */
  duration?: number;
  /** Additional className for the wrapper div */
  className?: string;
}

// Institutional, precise motion — not playful
const variants = {
  "fade-in": {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
  },
  "fade-up": {
    initial: { opacity: 0, y: 8 },
    animate: { opacity: 1, y: 0 },
  },
  none: {
    initial: {},
    animate: {},
  },
};

export function ContentReveal({
  children,
  variant = "fade-up",
  delay = 0,
  duration = 0.3,
  className,
}: ContentRevealProps) {
  const prefersReducedMotion = useReducedMotion();
  const effectiveVariant = prefersReducedMotion ? "none" : variant;
  const v = variants[effectiveVariant];

  return (
    <motion.div
      initial={v.initial}
      animate={v.animate}
      transition={{
        duration: prefersReducedMotion ? 0 : duration,
        delay: prefersReducedMotion ? 0 : delay,
        ease: [0.25, 0.1, 0.25, 1],
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
