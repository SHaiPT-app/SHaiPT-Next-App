import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { hasFeatureAccess, getRequiredTier } from './subscriptions';
import type { FeatureKey } from './subscriptions';
import type { Subscription } from './types';

interface AuthResult {
    userId: string;
    subscription: Subscription;
}

/**
 * Verify that the authenticated user has an active subscription with access
 * to the requested feature. Returns the user ID and subscription on success,
 * or a NextResponse error on failure.
 */
export async function requireFeatureAccess(
    request: Request,
    feature: FeatureKey
): Promise<AuthResult | NextResponse> {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { global: { headers: { Authorization: `Bearer ${token}` } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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

    return { userId: user.id, subscription: subscription as Subscription };
}

/**
 * Type guard to check if the result is an error response
 */
export function isErrorResponse(
    result: AuthResult | NextResponse
): result is NextResponse {
    return result instanceof NextResponse;
}
