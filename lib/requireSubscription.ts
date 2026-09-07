import { NextResponse } from 'next/server';
import { getUser, isErrorResponse as isAuthError } from './auth';
import { hasFeatureAccess, getRequiredTier } from './subscriptions';
import type { FeatureKey } from './subscriptions';
import type { Subscription } from './types';

interface AuthResult {
    userId: string;
    subscription: Subscription;
    /** test account: full access, no Stripe */
    tester: boolean;
}

/** The subscription a tester is treated as having. */
function testerSubscription(userId: string): Subscription {
    return {
        id: `tester-${userId}`,
        user_id: userId,
        tier: 'elite',
        status: 'active',
    } as Subscription;
}

/**
 * Verify that the authenticated user has an active subscription with access
 * to the requested feature. Returns the user ID and subscription on success,
 * or a NextResponse error on failure. Profiles with `tester = true` pass every check.
 */
export async function requireFeatureAccess(
    request: Request,
    feature: FeatureKey
): Promise<AuthResult | NextResponse> {
    const auth = await getUser(request);
    if (isAuthError(auth)) return auth;
    const { user, supabase } = auth;

    const { data: profile } = await supabase
        .from('profiles')
        .select('tester')
        .eq('id', user.id)
        .single();
    if (profile?.tester === true) {
        return { userId: user.id, subscription: testerSubscription(user.id), tester: true };
    }

    const { data: subscription } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .single();

    if (!hasFeatureAccess(subscription as Subscription | null, feature)) {
        const requiredTier = getRequiredTier(feature);
        return NextResponse.json(
            {
                error: 'Subscription required',
                required_tier: requiredTier,
                current_tier: (subscription as Subscription | null)?.tier || null,
                current_status: (subscription as Subscription | null)?.status || null,
            },
            { status: 403 }
        );
    }

    return { userId: user.id, subscription: subscription as Subscription, tester: false };
}

/**
 * Type guard to check if the result is an error response
 */
export function isErrorResponse(
    result: AuthResult | NextResponse
): result is NextResponse {
    return result instanceof NextResponse;
}
