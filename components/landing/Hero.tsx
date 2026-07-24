'use client';

import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import TextType from '@/components/TextType';
import { fadeInUp, fadeInDown, staggerContainer, scaleIn } from '@/lib/animations';

export default function Hero() {
  return (
    <section className="relative flex min-h-screen flex-col overflow-hidden">
      {/* Ambient background */}
      <div className="bg-grid absolute inset-0 z-0" />
      <div className="glow-orb -top-[20%] left-[10%] h-[50vw] w-[50vw]" />
      <div className="glow-orb glow-orb--pink -bottom-[10%] right-[10%] h-[40vw] w-[40vw]" />

      {/* Navbar */}
      <motion.nav
        initial={false}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="glass-card relative z-10 mx-auto mt-4 flex w-[calc(100%-2rem)] max-w-6xl items-center justify-between rounded-2xl px-4 py-3 sm:px-6"
      >
        <Link href="/" className="flex items-center gap-2.5">
          <Image src="/logo_transparent.png" alt="SHaiPT" width={40} height={40} priority />
          <span className="font-display text-2xl font-extrabold tracking-tight text-white">
            SH<span className="text-brand">ai</span>PT
          </span>
        </Link>

        <div className="hidden items-center gap-7 md:flex">
          <Link href="#features" className="text-sm font-medium text-ink-mid transition-colors hover:text-brand">
            Features
          </Link>
          <Link href="#comparison" className="text-sm font-medium text-ink-mid transition-colors hover:text-brand">
            Compare
          </Link>
          <Link href="#pricing" className="text-sm font-medium text-ink-mid transition-colors hover:text-brand">
            Pricing
          </Link>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="hidden text-sm font-semibold text-ink-mid transition-colors hover:text-white sm:block"
          >
            Sign in
          </Link>
          <Link href="/login" className="btn-brand !px-5 !py-2.5 !text-sm">
            Get Started
          </Link>
        </div>
      </motion.nav>

      {/* Hero content */}
      <motion.div
        variants={staggerContainer}
        initial={false}
        animate="visible"
        className="relative z-[1] flex flex-1 flex-col items-center justify-center px-4 pt-16 text-center"
      >
        <motion.div variants={fadeInDown} className="badge-brand mb-7">
          <span className="dot" />
          AI-Powered Personal Training
        </motion.div>

        <motion.p
          variants={fadeInUp}
          className="font-display mb-3 text-sm font-bold uppercase tracking-[0.2em] text-ink-mid sm:text-base"
        >
          Don&apos;t just train.{' '}
          <span className="text-brand [text-shadow:0_0_20px_var(--brand-glow)]">Get SHaiPT</span>
        </motion.p>

        <motion.h1
          variants={fadeInUp}
          className="display mb-6 max-w-4xl text-[clamp(2.6rem,7vw,5.25rem)] font-black"
        >
          Let&apos;s{' '}
          <TextType
            text={['Get SHaiPT', 'Train Smart', 'Push Limits', 'Crush Goals']}
            as="span"
            typingSpeed={100}
            pauseDuration={5000}
            deletingSpeed={50}
            loop={true}
            textColors={['#FF6600']}
            cursorCharacter="|"
            showCursor={true}
            cursorClassName=""
            style={{
              color: '#FF6600',
              display: 'inline',
              textShadow: '0 0 30px rgba(255, 102, 0, 0.4)',
            }}
          />
        </motion.h1>

        <motion.p
          variants={fadeInUp}
          className="mb-10 max-w-2xl text-lg leading-relaxed text-ink-mid sm:text-xl"
        >
          Real-time AI form analysis, periodized workout plans, and complete
          nutrition tracking. Your personal trainer that never sleeps.
        </motion.p>

        {/* CTAs */}
        <motion.div variants={fadeInUp} className="mb-6 flex flex-wrap items-center justify-center gap-4">
          <Link href="/login" className="btn-brand !text-lg">
            Start Free Trial
          </Link>
          <Link href="/demo" data-testid="try-demo-cta" className="btn-soft !text-lg">
            Try 5-Min Demo
          </Link>
          <Link href="#features" className="btn-outline !text-lg">
            See Features
          </Link>
        </motion.div>

        {/* Trust line */}
        <motion.div
          variants={fadeInUp}
          className="mb-14 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-ink-low"
        >
          <span>No credit card required</span>
          <span className="hidden h-1 w-1 rounded-full bg-line-strong sm:block" />
          <span>Cancel anytime</span>
          <span className="hidden h-1 w-1 rounded-full bg-line-strong sm:block" />
          <span>Free Pro month for consistency</span>
        </motion.div>

        {/* Showcase image */}
        <motion.div variants={scaleIn} className="relative -mb-[10%] w-full max-w-5xl">
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
      </motion.div>
    </section>
  );
}
