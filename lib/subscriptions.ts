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

// ============================================
// CONSISTENCY CHALLENGE LOGIC
// ============================================

export const CONSISTENCY_CHALLENGE_CONFIG = {
    durationWeeks: 12,
    minWorkoutsPerWeek: 3,
    maxWorkoutsPerWeek: 5,
    maxMissedDaysPerWeek: 2,
    gracePeriodMaxDays: 21,
    rewardTier: 'pro' as SubscriptionTier,
    rewardDurationMonths: 3,
};

/**
 * Check if a user has earned Pro via consistency challenge
 */
export function hasConsistencyPro(subscription: Subscription | null): boolean {
    if (!subscription) return false;

    // Check if subscription was earned via consistency
    const extendedSub = subscription as any;
    if (extendedSub.earned_via_consistency && extendedSub.consistency_challenge_id) {
        // Check if still within the reward period (3 months from earning)
        // This would need additional date checking in production
        return subscription.status === 'active' && subscription.tier === 'pro';
    }

    return false;
}

/**
 * Check if user can enroll in consistency challenge
 */
export function canEnrollInConsistencyChallenge(
    subscription: Subscription | null,
    hasActiveChallenge: boolean,
    hasPreviouslyCompleted: boolean,
): { canEnroll: boolean; reason?: string } {
    // Can't enroll if already has active challenge
    if (hasActiveChallenge) {
        return { canEnroll: false, reason: 'Already enrolled in a challenge' };
    }

    // Can't enroll if already completed and earned Pro
    if (hasPreviouslyCompleted) {
        return { canEnroll: false, reason: 'Already completed the challenge' };
    }

    // Can enroll if on starter or no subscription
    if (!subscription || subscription.tier === 'starter') {
        return { canEnroll: true };
    }

    // Can't enroll if already pro/elite (why would they?)
    if (subscription.tier === 'pro' || subscription.tier === 'elite') {
        return { canEnroll: false, reason: 'Already have Pro or Elite subscription' };
    }

    return { canEnroll: true };
}

/**
 * Calculate consistency challenge progress
 */
export function calculateChallengeProgress(
    weeksCompleted: number,
    missedDaysThisWeek: number,
): {
    progress: number;
    status: 'on_track' | 'at_risk' | 'failing';
    weeksRemaining: number;
} {
    const totalWeeks = CONSISTENCY_CHALLENGE_CONFIG.durationWeeks;
    const progress = Math.round((weeksCompleted / totalWeeks) * 100);
    const weeksRemaining = totalWeeks - weeksCompleted;

    let status: 'on_track' | 'at_risk' | 'failing' = 'on_track';

    if (missedDaysThisWeek >= CONSISTENCY_CHALLENGE_CONFIG.maxMissedDaysPerWeek) {
        status = 'failing';
    } else if (missedDaysThisWeek === CONSISTENCY_CHALLENGE_CONFIG.maxMissedDaysPerWeek - 1) {
        status = 'at_risk';
    }

    return { progress, status, weeksRemaining };
}

/**
 * Determine if a week was successfully completed
 */
export function isWeekSuccessful(
    scheduledWorkouts: number,
    completedWorkouts: number,
    missedDays: number,
): boolean {
    // Must complete minimum workouts
    if (completedWorkouts < CONSISTENCY_CHALLENGE_CONFIG.minWorkoutsPerWeek) {
        return false;
    }

    // Can't miss more than allowed days
    if (missedDays > CONSISTENCY_CHALLENGE_CONFIG.maxMissedDaysPerWeek) {
        return false;
    }

    return true;
}

/**
 * Handle challenge failure
 */
export function handleChallengeFailure(
    currentSubscription: Subscription | null,
    earnedViaChallengeId: string | null,
): {
    shouldLosePro: boolean;
    canRegain: boolean;
} {
    // If subscription was earned via this challenge, they lose it
    const extendedSub = currentSubscription as any;
    const shouldLosePro = extendedSub?.consistency_challenge_id === earnedViaChallengeId;

    // They can regain by maintaining a 4-week streak
    const canRegain = true;

    return { shouldLosePro, canRegain };
}
