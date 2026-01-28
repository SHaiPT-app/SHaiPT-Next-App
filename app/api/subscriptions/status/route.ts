import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import type { Subscription } from '@/lib/types';

export async function GET(request: Request) {
    try {
        const authHeader = request.headers.get('Authorization');
        if (!authHeader) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const token = authHeader.replace('Bearer ', '');
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { data: subscription, error } = await supabase
            .from('subscriptions')
            .select('*')
            .eq('user_id', user.id)
            .single();

        if (error && error.code !== 'PGRST116') {
            throw error;
        }

        // If no subscription exists, return null (user has no plan)
        if (!subscription) {
            return NextResponse.json({ subscription: null });
        }

        // Check if trial has expired
        const sub = subscription as Subscription;
        if (sub.status === 'trialing' && sub.trial_end) {
            const trialEnd = new Date(sub.trial_end);
            if (trialEnd < new Date()) {
                // Trial expired - mark as incomplete
                return NextResponse.json({
                    subscription: { ...sub, status: 'incomplete' as const },
                });
            }
        }

        return NextResponse.json({ subscription: sub });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Internal Server Error';
        console.error('Subscription status error:', error);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
