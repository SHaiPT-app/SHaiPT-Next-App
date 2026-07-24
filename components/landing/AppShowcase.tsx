'use client';

import Image from 'next/image';
import { motion } from 'framer-motion';
import { scaleIn } from '@/lib/animations';

/**
 * App showcase mockup. Extracted out of Hero so the landing page reads
 * Hero → ScrollVideoSection → AppShowcase → Features. Sits over the fixed
 * FloatingLines background (no opaque surface of its own).
 */
export default function AppShowcase() {
  return (
    <section className="relative z-[1] flex justify-center px-4 py-20 sm:py-28">
      {/* Showcase image */}
      <motion.div
        variants={scaleIn}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.25 }}
        className="relative w-full max-w-5xl"
      >
        <div className="absolute left-1/2 top-1/2 h-4/5 w-4/5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(ellipse,var(--brand-glow-soft),transparent_70%)] blur-[60px]" />
        <Image
          src="/mockups/shaipt_app_showcase_v2.png"
          alt="SHaiPT App Showcase"
          width={1200}
          height={800}
          priority
          className="relative z-[1] h-auto w-full drop-shadow-[0_-20px_60px_rgba(0,0,0,0.5)]"
        />
      </motion.div>
    </section>
  );
}
