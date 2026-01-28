import {
    hasFeatureAccess,
    getRequiredTier,
    TIER_FEATURES,
    TIER_PRICES,
    TRIAL_DAYS,
} from '@/lib/subscriptions';
import type { Subscription } from '@/lib/types';

describe('subscriptions', () => {
    describe('TIER_PRICES', () => {
        it('has correct prices in cents', () => {
            expect(TIER_PRICES.starter).toBe(999);
            expect(TIER_PRICES.pro).toBe(1999);
            expect(TIER_PRICES.elite).toBe(2999);
        });
    });

    describe('TRIAL_DAYS', () => {
        it('is 14 days', () => {
            expect(TRIAL_DAYS).toBe(14);
        });
    });

    describe('TIER_FEATURES', () => {
        it('starter tier has workout_planner only', () => {
            expect(TIER_FEATURES.starter.workout_planner).toBe(true);
            expect(TIER_FEATURES.starter.dietitian).toBe(false);
            expect(TIER_FEATURES.starter.form_checker).toBe(false);
            expect(TIER_FEATURES.starter.advanced_analytics).toBe(false);
            expect(TIER_FEATURES.starter.coach_dashboard).toBe(false);
            expect(TIER_FEATURES.starter.api_access).toBe(false);
        });

        it('pro tier includes dietitian and form_checker', () => {
            expect(TIER_FEATURES.pro.workout_planner).toBe(true);
            expect(TIER_FEATURES.pro.dietitian).toBe(true);
            expect(TIER_FEATURES.pro.form_checker).toBe(true);
            expect(TIER_FEATURES.pro.advanced_analytics).toBe(true);
            expect(TIER_FEATURES.pro.coach_dashboard).toBe(false);
            expect(TIER_FEATURES.pro.api_access).toBe(false);
        });

        it('elite tier has all features', () => {
            expect(TIER_FEATURES.elite.workout_planner).toBe(true);
            expect(TIER_FEATURES.elite.dietitian).toBe(true);
            expect(TIER_FEATURES.elite.form_checker).toBe(true);
            expect(TIER_FEATURES.elite.advanced_analytics).toBe(true);
            expect(TIER_FEATURES.elite.coach_dashboard).toBe(true);
            expect(TIER_FEATURES.elite.api_access).toBe(true);
        });
    });

    describe('hasFeatureAccess', () => {
        const makeSubscription = (overrides: Partial<Subscription> = {}): Subscription => ({
            id: 'sub-1',
            user_id: 'user-1',
            tier: 'starter',
            status: 'active',
            ...overrides,
        });

        it('returns false when subscription is null', () => {
            expect(hasFeatureAccess(null, 'workout_planner')).toBe(false);
        });

        it('returns true for active subscription with matching feature', () => {
            const sub = makeSubscription({ tier: 'starter', status: 'active' });
            expect(hasFeatureAccess(sub, 'workout_planner')).toBe(true);
        });

        it('returns false for active subscription without matching feature', () => {
            const sub = makeSubscription({ tier: 'starter', status: 'active' });
            expect(hasFeatureAccess(sub, 'dietitian')).toBe(false);
        });

        it('returns true for trialing subscription with valid trial', () => {
            const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
            const sub = makeSubscription({
                tier: 'pro',
                status: 'trialing',
                trial_end: futureDate,
            });
            expect(hasFeatureAccess(sub, 'dietitian')).toBe(true);
        });

        it('returns false for trialing subscription with expired trial', () => {
            const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
            const sub = makeSubscription({
                tier: 'pro',
                status: 'trialing',
                trial_end: pastDate,
            });
            expect(hasFeatureAccess(sub, 'dietitian')).toBe(false);
        });

        it('returns false for canceled subscription', () => {
            const sub = makeSubscription({ tier: 'pro', status: 'canceled' });
            expect(hasFeatureAccess(sub, 'workout_planner')).toBe(false);
        });

        it('returns false for past_due subscription', () => {
            const sub = makeSubscription({ tier: 'elite', status: 'past_due' });
            expect(hasFeatureAccess(sub, 'coach_dashboard')).toBe(false);
        });

        it('returns false for incomplete subscription', () => {
            const sub = makeSubscription({ tier: 'pro', status: 'incomplete' });
            expect(hasFeatureAccess(sub, 'workout_planner')).toBe(false);
        });

        it('pro tier can access all starter features', () => {
            const sub = makeSubscription({ tier: 'pro', status: 'active' });
            expect(hasFeatureAccess(sub, 'workout_planner')).toBe(true);
        });

        it('elite tier can access all features', () => {
            const sub = makeSubscription({ tier: 'elite', status: 'active' });
            expect(hasFeatureAccess(sub, 'workout_planner')).toBe(true);
            expect(hasFeatureAccess(sub, 'dietitian')).toBe(true);
            expect(hasFeatureAccess(sub, 'form_checker')).toBe(true);
            expect(hasFeatureAccess(sub, 'advanced_analytics')).toBe(true);
            expect(hasFeatureAccess(sub, 'coach_dashboard')).toBe(true);
            expect(hasFeatureAccess(sub, 'api_access')).toBe(true);
        });
    });

    describe('getRequiredTier', () => {
        it('returns starter for workout_planner', () => {
            expect(getRequiredTier('workout_planner')).toBe('starter');
        });

        it('returns pro for dietitian', () => {
            expect(getRequiredTier('dietitian')).toBe('pro');
        });

        it('returns pro for form_checker', () => {
            expect(getRequiredTier('form_checker')).toBe('pro');
        });

        it('returns pro for advanced_analytics', () => {
            expect(getRequiredTier('advanced_analytics')).toBe('pro');
        });

        it('returns elite for coach_dashboard', () => {
            expect(getRequiredTier('coach_dashboard')).toBe('elite');
        });

        it('returns elite for api_access', () => {
            expect(getRequiredTier('api_access')).toBe('elite');
        });
    });
});
