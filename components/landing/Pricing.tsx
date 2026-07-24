'use client';

import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { ScrollReveal } from '@/components/ScrollReveal';
import { fadeInUp, staggerContainer } from '@/lib/animations';
import type { SubscriptionTier } from '@/lib/types';

interface PricingTier {
  name: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  highlighted: boolean;
  ctaText: string;
  tier: SubscriptionTier;
}

const tiers: PricingTier[] = [
  {
    name: 'Starter',
    price: '$9.99',
    period: '/month',
    description: 'Perfect for getting started with AI-powered training.',
    features: [
      'AI workout generation',
      'Basic exercise library',
      'Workout logging',
      'Progress tracking',
      'Community access',
    ],
    highlighted: false,
    ctaText: 'Get Started',
    tier: 'starter',
  },
  {
    name: 'Pro',
    price: '$19.99',
    period: '/month',
    description: 'Start as a Pro for free, because you are a Pro, if you are consistent.',
    features: [
      'Everything in Starter',
      'Real-time form analysis',
      'AI nutrition coaching',
      'Periodized programming',
      'Advanced analytics',
      'Priority AI access',
    ],
    highlighted: true,
    ctaText: 'Start Pro Trial',
    tier: 'pro',
  },
  {
    name: 'Elite',
    price: '$29.99',
    period: '/month',
    description: 'For serious athletes and fitness professionals.',
    features: [
      'Everything in Pro',
      'Coach dashboard',
      'Client management',
      'Custom program templates',
      'White-label options',
      'API access',
      'Dedicated support',
    ],
    highlighted: false,
    ctaText: 'Contact Sales',
    tier: 'elite',
  },
];

export default function Pricing() {
  const [loadingTier, setLoadingTier] = useState<SubscriptionTier | null>(null);

  const handleSubscribe = useCallback(async (tier: SubscriptionTier) => {
    // Check if user is logged in
    const user = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
    if (!user) {
      window.location.href = '/login';
      return;
    }

    setLoadingTier(tier);
    try {
      const parsed = JSON.parse(user);
      const session = parsed?.session?.access_token;
      if (!session) {
        window.location.href = '/login';
        return;
      }

      const res = await fetch('/api/subscriptions/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session}`,
        },
        body: JSON.stringify({ tier }),
      });

      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      // Redirect to login on error
      window.location.href = '/login';
    } finally {
      setLoadingTier(null);
    }
  }, []);

  return (
    <section id="pricing" className="relative overflow-hidden px-4 py-24 sm:px-8">
      <div className="glow-orb left-1/2 top-[30%] h-[40vw] w-[60vw] -translate-x-1/2" />

      <div className="relative z-[1] mx-auto max-w-6xl">
        <ScrollReveal>
          <div className="mb-16 flex flex-col items-center text-center">
            <span className="eyebrow mb-4">Pricing</span>
            <h2 className="display mb-4 text-[clamp(2rem,5vw,3.5rem)]">
              Train Hard. <span className="text-gradient-brand">Pay Smart.</span>
            </h2>
            <p className="max-w-lg text-lg text-ink-mid">
              Stay consistent and your Pro month is free. That&apos;s the SHaiPT deal.
            </p>
          </div>
        </ScrollReveal>

        <ScrollReveal variants={staggerContainer}>
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.15 }}
            className="grid grid-cols-1 items-stretch gap-6 md:grid-cols-3"
          >
            {tiers.map((tier) => (
              <motion.div
                key={tier.tier}
                variants={fadeInUp}
                className={`glass-card glass-card-hover relative flex flex-col p-8 ${
                  tier.highlighted
                    ? 'border-brand/40 shadow-[0_0_48px_var(--brand-glow-soft)] md:-my-4 md:py-12'
                    : ''
                }`}
              >
                {tier.highlighted && (
                  <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-[image:var(--brand-gradient)] px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-white shadow-[0_4px_16px_var(--brand-glow)]">
                    Most Popular
                  </span>
                )}

                <h3 className="font-display mb-2 text-xl font-bold text-white">{tier.name}</h3>
                <div className="mb-3 flex items-baseline gap-1">
                  <span
                    className={`font-display text-5xl font-extrabold ${
                      tier.highlighted ? 'text-gradient-brand' : 'text-white'
                    }`}
                  >
                    {tier.price}
                  </span>
                  <span className="text-sm text-ink-low">{tier.period}</span>
                </div>
                <p className="mb-7 text-sm leading-relaxed text-ink-mid">{tier.description}</p>

                <ul className="mb-8 flex flex-col gap-3">
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-3 text-sm text-ink-mid">
                      <Check
                        className={`h-4 w-4 shrink-0 ${
                          tier.highlighted ? 'text-brand' : 'text-ink-low'
                        }`}
                      />
                      {feature}
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => handleSubscribe(tier.tier)}
                  disabled={loadingTier !== null}
                  className={`mt-auto w-full ${tier.highlighted ? 'btn-brand' : 'btn-outline'}`}
                >
                  {loadingTier === tier.tier ? 'Redirecting…' : tier.ctaText}
                </button>
              </motion.div>
            ))}
          </motion.div>
        </ScrollReveal>

        <ScrollReveal>
          <p className="mt-12 text-center text-sm text-ink-low">
            All plans include a free trial. Cancel anytime, no questions asked.
          </p>
        </ScrollReveal>
      </div>
    </section>
  );
}
