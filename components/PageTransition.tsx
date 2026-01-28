"use client"

import { motion, type Variants } from "framer-motion"
import { pageTransition, gpuAccelerated } from "@/lib/animations"
import type { ReactNode } from "react"

interface PageTransitionProps {
  children: ReactNode
  variants?: Variants
  className?: string
}

export function PageTransition({
  children,
  variants = pageTransition,
  className,
}: PageTransitionProps) {
  return (
    <motion.div
      initial="initial"
      animate="animate"
      exit="exit"
      variants={variants}
      className={className}
      style={gpuAccelerated}
    >
      {children}
    </motion.div>
  )
}
