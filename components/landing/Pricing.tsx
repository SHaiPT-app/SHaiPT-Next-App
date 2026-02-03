'use client';

import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
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
    <section
      id="pricing"
      style={{
        padding: '6rem 1rem',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Background glow */}
      <div
        style={{
          position: 'absolute',
          top: '30%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '60vw',
          height: '40vw',
          background:
            'radial-gradient(ellipse, rgba(255, 102, 0, 0.06), transparent 70%)',
          filter: 'blur(80px)',
          zIndex: 0,
        }}
      />

      <div style={{ maxWidth: '1200px', margin: '0 auto', position: 'relative', zIndex: 1 }}>
        <ScrollReveal>
          <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
            <p
              style={{
                fontSize: '0.85rem',
                fontWeight: '600',
                color: '#FF6600',
                textTransform: 'uppercase',
                letterSpacing: '3px',
                marginBottom: '1rem',
              }}
            >
              Pricing
            </p>
            <h2
              style={{
                fontSize: 'clamp(2rem, 5vw, 3.5rem)',
                fontWeight: '800',
                color: '#fff',
                marginBottom: '1rem',
                fontFamily: 'var(--font-orbitron)',
              }}
            >
              Choose Your Plan
            </h2>
            <p
              style={{
                fontSize: '1.1rem',
                color: 'rgba(255,255,255,0.6)',
                maxWidth: '500px',
                margin: '0 auto',
              }}
            >
              Start free, upgrade when you&apos;re ready. Cancel anytime.
            </p>
          </div>
        </ScrollReveal>

        <ScrollReveal variants={staggerContainer}>
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.1 }}
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '2rem',
              alignItems: 'stretch',
            }}
          >
            {tiers.map((tier, index) => (
              <motion.div
                key={index}
                variants={fadeInUp}
                style={{
                  position: 'relative',
                  background: tier.highlighted
                    ? 'rgba(255, 102, 0, 0.06)'
                    : 'rgba(21, 21, 31, 0.6)',
                  backdropFilter: 'blur(16px)',
                  WebkitBackdropFilter: 'blur(16px)',
                  borderRadius: '20px',
                  border: tier.highlighted
                    ? '1px solid rgba(255, 102, 0, 0.3)'
                    : '1px solid rgba(255, 255, 255, 0.08)',
                  padding: '2.5rem',
                  display: 'flex',
                  flexDirection: 'column',
                  boxShadow: tier.highlighted
                    ? '0 0 40px rgba(255, 102, 0, 0.1)'
                    : '0 8px 32px rgba(0, 0, 0, 0.2)',
                }}
              >
                {/* Popular badge */}
                {tier.highlighted && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '-12px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      padding: '0.3rem 1rem',
                      background: 'linear-gradient(135deg, #FF6600, #CC5200)',
                      borderRadius: '50px',
                      fontSize: '0.75rem',
                      fontWeight: '700',
                      color: '#fff',
                      textTransform: 'uppercase',
                      letterSpacing: '1px',
                      boxShadow: '0 0 20px rgba(255, 102, 0, 0.3)',
                    }}
                  >
                    Most Popular
                  </div>
                )}

                <h3
                  style={{
                    fontSize: '1.3rem',
                    fontWeight: '700',
                    color: '#fff',
                    marginBottom: '0.5rem',
                    fontFamily: 'var(--font-orbitron)',
                  }}
                >
                  {tier.name}
                </h3>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'baseline',
                    gap: '0.25rem',
                    marginBottom: '0.75rem',
                  }}
                >
                  <span
                    style={{
                      fontSize: '3rem',
                      fontWeight: '900',
                      color: '#fff',
                      fontFamily: 'var(--font-orbitron)',
                    }}
                  >
                    {tier.price}
                  </span>
                  <span
                    style={{
                      fontSize: '1rem',
                      color: 'rgba(255,255,255,0.5)',
                    }}
                  >
                    {tier.period}
                  </span>
                </div>

                <p
                  style={{
                    fontSize: '0.95rem',
                    color: 'rgba(255,255,255,0.5)',
                    lineHeight: '1.6',
                    marginBottom: '2rem',
                  }}
                >
                  {tier.description}
                </p>

                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.75rem',
                    marginBottom: '2rem',
                    flex: 1,
                  }}
                >
                  {tier.features.map((feature, i) => (
                    <div
                      key={i}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        fontSize: '0.9rem',
                        color: 'rgba(255,255,255,0.75)',
                      }}
                    >
                      <span
                        style={{
                          color: '#FF6600',
                          fontSize: '0.85rem',
                          textShadow: '0 0 6px rgba(255, 102, 0, 0.3)',
                        }}
                      >
                        ✓
                      </span>
                      {feature}
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => handleSubscribe(tier.tier)}
                  disabled={loadingTier === tier.tier}
                  style={{
                    display: 'block',
                    width: '100%',
                    textAlign: 'center',
                    padding: '0.9rem 2rem',
                    borderRadius: '12px',
                    fontSize: '1rem',
                    fontWeight: '700',
                    cursor: loadingTier === tier.tier ? 'wait' : 'pointer',
                    transition: 'transform 0.2s, box-shadow 0.2s',
                    opacity: loadingTier === tier.tier ? 0.7 : 1,
                    ...(tier.highlighted
                      ? {
                          background:
                            'linear-gradient(135deg, #FF6600, #CC5200)',
                          color: '#fff',
                          boxShadow: '0 0 25px rgba(255, 102, 0, 0.3)',
                          border: 'none',
                        }
                      : {
                          background: 'transparent',
                          color: 'rgba(255,255,255,0.8)',
                          border: '1px solid rgba(255,255,255,0.15)',
                        }),
                  }}
                >
                  {loadingTier === tier.tier ? 'Loading...' : tier.ctaText}
                </button>
              </motion.div>
            ))}
          </motion.div>
        </ScrollReveal>
      </div>
    </section>
  );
}
