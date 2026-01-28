import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { user_id, reason, duration_days } = body;

        if (!user_id || !reason) {
            return NextResponse.json(
                { error: 'Missing required fields: user_id, reason' },
                { status: 400 }
            );
        }

        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // Get active challenge
        const { data: challenge, error: fetchError } = await supabase
            .from('consistency_challenges')
            .select('*')
            .eq('user_id', user_id)
            .eq('status', 'active')
            .single();

        if (fetchError || !challenge) {
            return NextResponse.json(
                { error: 'No active challenge found' },
                { status: 404 }
            );
        }

        // Check if grace period already requested
        if (challenge.grace_period_requested_at) {
            return NextResponse.json(
                { error: 'Grace period already requested for this challenge' },
                { status: 400 }
            );
        }

        // Calculate grace period expiry
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + (duration_days || 7));

        // Update challenge with grace period request
        const { data: updatedChallenge, error: updateError } = await supabase
            .from('consistency_challenges')
            .update({
                status: 'grace_period',
                grace_period_requested_at: new Date().toISOString(),
                grace_reason: reason,
                // Auto-approve for now (could add manual approval flow later)
                grace_period_approved_at: new Date().toISOString(),
                grace_period_expires_at: expiresAt.toISOString(),
                updated_at: new Date().toISOString(),
            })
            .eq('id', challenge.id)
            .select()
            .single();

        if (updateError) {
            console.error('Failed to request grace period:', updateError);
            return NextResponse.json(
                { error: 'Failed to request grace period' },
                { status: 500 }
            );
        }

        return NextResponse.json({
            challenge: updatedChallenge,
            message: 'Grace period approved',
        });
    } catch (error) {
        console.error('Error requesting grace period:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
