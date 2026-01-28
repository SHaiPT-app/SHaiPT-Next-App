import Stripe from 'stripe';
import type { SubscriptionTier, SubscriptionStatus, Subscription } from './types';

// Stripe instance (server-side only)
let stripeInstance: Stripe | null = null;

export function getStripe(): Stripe {
    if (!stripeInstance) {
        const key = process.env.STRIPE_SECRET_KEY;
        if (!key) {
            throw new Error('STRIPE_SECRET_KEY environment variable is not set');
        }
        stripeInstance = new Stripe(key);
    }
    return stripeInstance;
}

// Price IDs mapped to tiers - configure these in your Stripe dashboard
export const TIER_PRICE_IDS: Record<SubscriptionTier, string> = {
    starter: process.env.STRIPE_PRICE_STARTER || '',
    pro: process.env.STRIPE_PRICE_PRO || '',
    elite: process.env.STRIPE_PRICE_ELITE || '',
};

export const TIER_PRICES: Record<SubscriptionTier, number> = {
    starter: 999,  // $9.99 in cents
    pro: 1999,     // $19.99 in cents
    elite: 2999,   // $29.99 in cents
};

export const TRIAL_DAYS = 14;

// Feature access matrix per tier
export const TIER_FEATURES: Record<SubscriptionTier, {
    workout_planner: boolean;
    dietitian: boolean;
    form_checker: boolean;
    advanced_analytics: boolean;
    coach_dashboard: boolean;
    api_access: boolean;
}> = {
    starter: {
        workout_planner: true,
        dietitian: false,
        form_checker: false,
        advanced_analytics: false,
        coach_dashboard: false,
        api_access: false,
    },
    pro: {
        workout_planner: true,
        dietitian: true,
        form_checker: true,
        advanced_analytics: true,
        coach_dashboard: false,
        api_access: false,
    },
    elite: {
        workout_planner: true,
        dietitian: true,
        form_checker: true,
        advanced_analytics: true,
        coach_dashboard: true,
        api_access: true,
    },
};

export type FeatureKey = keyof typeof TIER_FEATURES.starter;

/**
 * Check if a subscription has access to a specific feature
 */
export function hasFeatureAccess(
    subscription: Subscription | null,
    feature: FeatureKey
): boolean {
    if (!subscription) return false;

    // Active or trialing subscriptions have access
    const activeStatuses: SubscriptionStatus[] = ['active', 'trialing'];
    if (!activeStatuses.includes(subscription.status)) return false;

    // Check if trial has expired for trialing subscriptions
    if (subscription.status === 'trialing' && subscription.trial_end) {
        const trialEnd = new Date(subscription.trial_end);
        if (trialEnd < new Date()) return false;
    }

    return TIER_FEATURES[subscription.tier]?.[feature] ?? false;
}

/**
 * Get the minimum tier required for a feature
 */
export function getRequiredTier(feature: FeatureKey): SubscriptionTier {
    if (TIER_FEATURES.starter[feature]) return 'starter';
    if (TIER_FEATURES.pro[feature]) return 'pro';
    return 'elite';
}
