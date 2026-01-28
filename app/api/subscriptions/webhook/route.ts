import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getStripe } from '@/lib/subscriptions';
import type { SubscriptionTier, SubscriptionStatus } from '@/lib/types';
import Stripe from 'stripe';

// Use service role to bypass RLS for webhook updates
function getAdminClient() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } }
    );
}

function mapStripeStatus(status: string): SubscriptionStatus {
    const statusMap: Record<string, SubscriptionStatus> = {
        trialing: 'trialing',
        active: 'active',
        canceled: 'canceled',
        past_due: 'past_due',
        incomplete: 'incomplete',
    };
    return statusMap[status] || 'incomplete';
}

export async function POST(request: Request) {
    try {
        const body = await request.text();
        const signature = request.headers.get('stripe-signature');

        if (!signature) {
            return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
        }

        const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
        if (!webhookSecret) {
            return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });
        }

        const stripe = getStripe();
        let event: Stripe.Event;

        try {
            event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
        } catch {
            return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
        }

        const supabaseAdmin = getAdminClient();

        switch (event.type) {
            case 'checkout.session.completed': {
                const session = event.data.object as Stripe.Checkout.Session;
                const userId = session.metadata?.supabase_user_id;
                const tier = (session.metadata?.tier || 'starter') as SubscriptionTier;

                if (userId && session.subscription) {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const subscription: any = await stripe.subscriptions.retrieve(
                        session.subscription as string
                    );

                    await supabaseAdmin.from('subscriptions').upsert({
                        user_id: userId,
                        stripe_customer_id: session.customer as string,
                        stripe_subscription_id: subscription.id,
                        tier,
                        status: mapStripeStatus(subscription.status),
                        trial_start: subscription.trial_start
                            ? new Date(subscription.trial_start * 1000).toISOString()
                            : null,
                        trial_end: subscription.trial_end
                            ? new Date(subscription.trial_end * 1000).toISOString()
                            : null,
                        current_period_start: new Date(
                            subscription.current_period_start * 1000
                        ).toISOString(),
                        current_period_end: new Date(
                            subscription.current_period_end * 1000
                        ).toISOString(),
                    }, { onConflict: 'user_id' });
                }
                break;
            }

            case 'customer.subscription.updated':
            case 'customer.subscription.deleted': {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const subscription = event.data.object as any;
                const userId = subscription.metadata?.supabase_user_id;

                if (userId) {
                    await supabaseAdmin.from('subscriptions').upsert({
                        user_id: userId,
                        stripe_subscription_id: subscription.id,
                        status: mapStripeStatus(subscription.status),
                        tier: (subscription.metadata?.tier || 'starter') as SubscriptionTier,
                        current_period_start: new Date(
                            subscription.current_period_start * 1000
                        ).toISOString(),
                        current_period_end: new Date(
                            subscription.current_period_end * 1000
                        ).toISOString(),
                        cancel_at_period_end: subscription.cancel_at_period_end,
                        trial_start: subscription.trial_start
                            ? new Date(subscription.trial_start * 1000).toISOString()
                            : null,
                        trial_end: subscription.trial_end
                            ? new Date(subscription.trial_end * 1000).toISOString()
                            : null,
                    }, { onConflict: 'user_id' });
                }
                break;
            }
        }

        return NextResponse.json({ received: true });
    } catch (error: unknown) {
        console.error('Webhook error:', error);
        return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
    }
}
