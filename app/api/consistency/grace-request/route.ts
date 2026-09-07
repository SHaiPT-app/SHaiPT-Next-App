import { NextRequest, NextResponse } from 'next/server';
import { getUser, isErrorResponse } from '@/lib/auth';

// `user_id` in the body is ignored: the request is for the caller's own challenge.
export async function POST(request: NextRequest) {
    const auth = await getUser(request);
    if (isErrorResponse(auth)) return auth;

    try {
        const body = await request.json();
        const { reason, duration_days } = body;

        if (!reason) {
            return NextResponse.json(
                { error: 'Missing required field: reason' },
                { status: 400 }
            );
        }

        const supabase = auth.supabase;

        // Get active challenge
        const { data: challenge, error: fetchError } = await supabase
            .from('consistency_challenges')
            .select('*')
            .eq('user_id', auth.user.id)
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
            .eq('user_id', auth.user.id)
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
