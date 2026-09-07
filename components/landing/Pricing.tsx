'use client';

import { useState, useCallback } from 'react';
import type { SubscriptionTier } from '@/lib/types';
import { apiFetch } from '@/lib/apiClient';

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
      if (parsed?.tester) {
        window.location.href = '/home';
        return;
      }

      // the token comes from the Supabase session (apiFetch), not from localStorage
      const data = await apiFetch<{ url?: string }>('/api/subscriptions/checkout', {
        method: 'POST',
        body: { tier },
      });
      if (data?.url) {
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
    <section id="pricing" className="pr" aria-label="Pricing">
      <div className="pr-head">
        <div className="pr-kicker">Pricing — 03</div>
        <h2 className="pr-title">
          Train hard. <em>Pay smart.</em>
        </h2>
        <p className="pr-lede">Stay consistent and your Pro month is free. Every plan starts with a trial; cancel any time.</p>
      </div>

      <div className="pr-ledger" role="table">
        {tiers.map((tier, i) => (
          <div key={tier.tier} className={`pr-col${tier.highlighted ? ' is-hi' : ''}`} role="row">
            <div className="pr-n">
              {String(i + 1).padStart(2, '0')}
              {tier.highlighted && <span className="pr-tag">Most chosen</span>}
            </div>
            <h3 className="pr-name">{tier.name}</h3>
            <div className="pr-price">
              <span>{tier.price}</span>
              <small>{tier.period}</small>
            </div>
            <p className="pr-desc">{tier.description}</p>
            <ul className="pr-list">
              {tier.features.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
            <button
              type="button"
              onClick={() => handleSubscribe(tier.tier)}
              disabled={loadingTier !== null}
              className={`pr-btn${tier.highlighted ? ' is-hi' : ''}`}
            >
              {loadingTier === tier.tier ? 'Redirecting…' : tier.ctaText}
            </button>
          </div>
        ))}
      </div>

      <style jsx>{`
        .pr {
          position: relative;
          z-index: 1;
          padding: clamp(5rem, 12vh, 9rem) clamp(1.25rem, 5vw, 4.5rem);
          color: #fff;
          background: rgba(5, 5, 7, 0.86);
          border-top: 1px solid rgba(255, 255, 255, 0.12);
        }
        .pr-head {
          max-width: 60rem;
          margin-bottom: 3.5rem;
        }
        .pr-kicker,
        .pr-n,
        .pr-list,
        .pr-btn,
        .pr-price small {
          font-family: var(--font-geist-mono), ui-monospace, monospace;
          font-size: 0.7rem;
          letter-spacing: 0.2em;
          text-transform: uppercase;
        }
        .pr-kicker {
          color: var(--brand);
          margin-bottom: 1.2rem;
        }
        .pr-title {
          margin: 0 0 1.2rem;
          font-family: var(--font-editorial), 'Times New Roman', serif;
          font-weight: 400;
          font-size: clamp(2.6rem, 6vw, 5.6rem);
          line-height: 0.96;
          letter-spacing: -0.02em;
        }
        .pr-title em {
          font-style: italic;
          color: rgba(255, 255, 255, 0.5);
        }
        .pr-lede {
          margin: 0;
          max-width: 46ch;
          color: rgba(255, 255, 255, 0.7);
          line-height: 1.6;
        }
        .pr-ledger {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          border-top: 1px solid rgba(255, 255, 255, 0.2);
          border-bottom: 1px solid rgba(255, 255, 255, 0.2);
        }
        .pr-col {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          padding: 2.2rem clamp(1rem, 2.5vw, 2.4rem);
          border-right: 1px solid rgba(255, 255, 255, 0.12);
        }
        .pr-col:last-child {
          border-right: 0;
        }
        .pr-col.is-hi {
          background: rgba(218, 0, 35, 0.06);
          box-shadow: inset 0 2px 0 var(--brand);
        }
        .pr-n {
          display: flex;
          align-items: center;
          justify-content: space-between;
          color: rgba(255, 255, 255, 0.5);
        }
        .pr-tag {
          color: var(--brand);
        }
        .pr-name {
          margin: 0.4rem 0 0;
          font-family: var(--font-editorial), 'Times New Roman', serif;
          font-weight: 400;
          font-size: 2rem;
          line-height: 1;
        }
        .pr-price {
          display: flex;
          align-items: baseline;
          gap: 0.5rem;
          font-family: var(--font-editorial), 'Times New Roman', serif;
          font-size: clamp(2.6rem, 4vw, 3.6rem);
          line-height: 1;
          letter-spacing: -0.02em;
          font-variant-numeric: tabular-nums;
        }
        .pr-price small {
          color: rgba(255, 255, 255, 0.5);
        }
        .pr-desc {
          margin: 0;
          color: rgba(255, 255, 255, 0.7);
          line-height: 1.6;
          font-size: 0.95rem;
          min-height: 3.2em;
        }
        .pr-list {
          list-style: none;
          margin: 0.4rem 0 0;
          padding: 0;
          border-top: 1px solid rgba(255, 255, 255, 0.14);
          color: rgba(255, 255, 255, 0.8);
          text-transform: none;
          letter-spacing: 0.06em;
          font-size: 0.78rem;
        }
        .pr-list li {
          padding: 0.65rem 0;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        }
        .pr-list li::before {
          content: '—';
          color: var(--brand);
          margin-right: 0.6rem;
        }
        .pr-btn {
          margin-top: auto;
          padding: 0.95rem 1.2rem;
          border: 1px solid rgba(255, 255, 255, 0.5);
          background: transparent;
          color: #fff;
          cursor: pointer;
          transition: background 0.2s ease, color 0.2s ease, border-color 0.2s ease;
        }
        .pr-btn:hover:not(:disabled) {
          background: #fff;
          color: #050507;
        }
        .pr-btn.is-hi {
          background: var(--brand);
          border-color: var(--brand);
        }
        .pr-btn.is-hi:hover:not(:disabled) {
          background: #fff;
          border-color: #fff;
          color: #050507;
        }
        .pr-btn:disabled {
          opacity: 0.6;
          cursor: wait;
        }
        @media (max-width: 900px) {
          .pr-ledger {
            grid-template-columns: 1fr;
          }
          .pr-col {
            border-right: 0;
            border-bottom: 1px solid rgba(255, 255, 255, 0.12);
          }
          .pr-col:last-child {
            border-bottom: 0;
          }
        }
      `}</style>
    </section>
  );
}
