"use client";

import { useReducedMotion } from "@/hooks/useReducedMotion";
import { motion } from "framer-motion";
import type { ReactNode } from "react";

interface StaggerRevealProps {
  children: ReactNode;
  /** Delay between each child animation in seconds. Defaults to 0.05 */
  staggerDelay?: number;
  /** Base delay before first child animates. Defaults to 0 */
  baseDelay?: number;
  /** className for the container */
  className?: string;
}

const containerVariants = {
  hidden: {},
  visible: (custom: { staggerDelay: number; baseDelay: number }) => ({
    transition: {
      staggerChildren: custom.staggerDelay,
      delayChildren: custom.baseDelay,
    },
  }),
};

const itemVariants = {
  hidden: { opacity: 0, y: 6 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.25,
      ease: [0.25, 0.1, 0.25, 1],
    },
  },
};

const noMotionVariants = {
  hidden: {},
  visible: {},
};

export function StaggerReveal({
  children,
  staggerDelay = 0.05,
  baseDelay = 0,
  className,
}: StaggerRevealProps) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.div
      variants={prefersReducedMotion ? noMotionVariants : containerVariants}
      initial="hidden"
      animate="visible"
      custom={{ staggerDelay, baseDelay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/** Wrap each child item in a StaggerReveal with this */
export function StaggerItem({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.div
      variants={prefersReducedMotion ? noMotionVariants : itemVariants}
      className={className}
    >
      {children}
    </motion.div>
  );
}
