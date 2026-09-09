import type { SubscriptionTier } from '@/lib/types';

/**
 * The three published tiers, in one place.
 *
 * Pricing.tsx renders these and the SoftwareApplication JSON-LD builds its `offers` from the
 * same array, so a price change cannot leave the markup advertising the old number.
 */
export interface PricingTier {
  name: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  highlighted: boolean;
  ctaText: string;
  tier: SubscriptionTier;
}

export const PRICING_TIERS: PricingTier[] = [
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
