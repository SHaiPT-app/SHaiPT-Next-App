import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getStripe, TIER_PRICE_IDS, TRIAL_DAYS } from '@/lib/subscriptions';
import type { SubscriptionTier } from '@/lib/types';

export async function POST(request: Request) {
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

        const { tier } = await request.json() as { tier: SubscriptionTier };

        if (!tier || !['starter', 'pro', 'elite'].includes(tier)) {
            return NextResponse.json({ error: 'Invalid tier' }, { status: 400 });
        }

        const priceId = TIER_PRICE_IDS[tier];
        if (!priceId) {
            return NextResponse.json(
                { error: 'Stripe price not configured for this tier' },
                { status: 500 }
            );
        }

        const stripe = getStripe();

        // Check if user already has a Stripe customer ID
        const { data: existingSub } = await supabase
            .from('subscriptions')
            .select('stripe_customer_id')
            .eq('user_id', user.id)
            .single();

        let customerId = existingSub?.stripe_customer_id;

        if (!customerId) {
            const customer = await stripe.customers.create({
                email: user.email,
                metadata: { supabase_user_id: user.id },
            });
            customerId = customer.id;
        }

        const session = await stripe.checkout.sessions.create({
            customer: customerId,
            mode: 'subscription',
            payment_method_types: ['card'],
            line_items: [{ price: priceId, quantity: 1 }],
            subscription_data: {
                trial_period_days: TRIAL_DAYS,
                metadata: { supabase_user_id: user.id, tier },
            },
            success_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/home?subscription=success`,
            cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/#pricing`,
            metadata: { supabase_user_id: user.id, tier },
        });

        return NextResponse.json({ url: session.url });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Internal Server Error';
        console.error('Checkout error:', error);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
