"use client"

import type { Variants, Transition } from "framer-motion"

// ─── Performance Helpers ────────────────────────────────────────────────────────

/**
 * Check if user prefers reduced motion.
 * Use this to conditionally disable animations at runtime.
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches
}

/**
 * Returns GPU-optimized style props for animated elements.
 * Apply to style prop of motion elements for better compositing.
 */
export const gpuAccelerated = {
  willChange: "transform, opacity" as const,
  backfaceVisibility: "hidden" as const,
} as const

// ─── Shared Transitions ────────────────────────────────────────────────────────

export const springTransition: Transition = {
  type: "spring",
  stiffness: 300,
  damping: 30,
}

export const smoothTransition: Transition = {
  type: "tween",
  ease: "easeOut",
  duration: 0.4,
}

// ─── Scroll-Triggered Reveal Variants ──────────────────────────────────────────

export const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: "easeOut" },
  },
}

export const fadeInDown: Variants = {
  hidden: { opacity: 0, y: -30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: "easeOut" },
  },
}

export const fadeInLeft: Variants = {
  hidden: { opacity: 0, x: -30 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.6, ease: "easeOut" },
  },
}

export const fadeInRight: Variants = {
  hidden: { opacity: 0, x: 30 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.6, ease: "easeOut" },
  },
}

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.5, ease: "easeOut" },
  },
}

/**
 * Stagger children variant — apply to a parent container, then use
 * any child variant (e.g. fadeInUp) on child elements.
 */
export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.05,
    },
  },
}

// ─── Page Transition Variants ──────────────────────────────────────────────────

export const pageTransition: Variants = {
  initial: { opacity: 0, y: 12 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: "easeOut" },
  },
  exit: {
    opacity: 0,
    y: -12,
    transition: { duration: 0.25, ease: "easeIn" },
  },
}

export const pageFade: Variants = {
  initial: { opacity: 0 },
  animate: {
    opacity: 1,
    transition: { duration: 0.3, ease: "easeOut" },
  },
  exit: {
    opacity: 0,
    transition: { duration: 0.2, ease: "easeIn" },
  },
}

// ─── Micro-Interaction Variants ────────────────────────────────────────────────

export const tapScale = {
  whileTap: { scale: 0.96 },
} as const

export const hoverScale = {
  whileHover: { scale: 1.03 },
} as const

export const hoverGlow = {
  whileHover: {
    boxShadow: "0 0 20px rgba(255, 102, 0, 0.4)",
  },
} as const

export const pulseVariant: Variants = {
  idle: { scale: 1 },
  pulse: {
    scale: [1, 1.05, 1],
    transition: { duration: 0.6, ease: "easeInOut" },
  },
}

export const shimmer: Variants = {
  idle: { opacity: 0.5 },
  shimmer: {
    opacity: [0.5, 1, 0.5],
    transition: { duration: 1.5, repeat: Infinity, ease: "easeInOut" },
  },
}

// ─── Overlay / Modal Variants ──────────────────────────────────────────────────

export const overlayVariant: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.2 } },
  exit: { opacity: 0, transition: { duration: 0.15 } },
}

export const modalVariant: Variants = {
  hidden: { opacity: 0, scale: 0.95, y: 10 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: springTransition,
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    y: 10,
    transition: { duration: 0.2 },
  },
}
