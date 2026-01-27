"use client"

import { motion, type Variants } from "framer-motion"
import { fadeInUp } from "@/lib/animations"
import type { ReactNode } from "react"

interface ScrollRevealProps {
  children: ReactNode
  variants?: Variants
  /** Viewport amount visible before triggering (0-1). Default 0.2 */
  amount?: number
  /** Trigger only once. Default true */
  once?: boolean
  className?: string
}

export function ScrollReveal({
  children,
  variants = fadeInUp,
  amount = 0.2,
  once = true,
  className,
}: ScrollRevealProps) {
  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once, amount }}
      variants={variants}
      className={className}
    >
      {children}
    </motion.div>
  )
}
