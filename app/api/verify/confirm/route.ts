import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const MAX_ATTEMPTS = 5;

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { user_id, code } = body;

        if (!user_id || !code) {
            return NextResponse.json(
                { error: 'Missing required fields: user_id, code' },
                { status: 400 }
            );
        }

        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // Get verification record
        const { data: verification, error: fetchError } = await supabase
            .from('phone_verifications')
            .select('*')
            .eq('user_id', user_id)
            .single();

        if (fetchError || !verification) {
            return NextResponse.json(
                { error: 'No verification request found' },
                { status: 404 }
            );
        }

        // Check if already verified
        if (verification.verified_at) {
            return NextResponse.json({
                success: true,
                message: 'Phone already verified',
            });
        }

        // Check attempts
        if (verification.attempts >= MAX_ATTEMPTS) {
            return NextResponse.json(
                { error: 'Too many attempts. Please request a new code.' },
                { status: 429 }
            );
        }

        // Check expiry
        if (new Date(verification.expires_at) < new Date()) {
            return NextResponse.json(
                { error: 'Verification code expired. Please request a new code.' },
                { status: 400 }
            );
        }

        // Increment attempts
        await supabase
            .from('phone_verifications')
            .update({ attempts: verification.attempts + 1 })
            .eq('id', verification.id);

        // Verify code
        if (verification.verification_code !== code) {
            return NextResponse.json(
                { error: 'Invalid verification code' },
                { status: 400 }
            );
        }

        // Mark as verified
        const { error: updateError } = await supabase
            .from('phone_verifications')
            .update({ verified_at: new Date().toISOString() })
            .eq('id', verification.id);

        if (updateError) {
            console.error('Failed to update verification:', updateError);
        }

        // Update user profile
        await supabase
            .from('profiles')
            .update({ phone_verified: true })
            .eq('id', user_id);

        return NextResponse.json({
            success: true,
            message: 'Phone verified successfully',
        });
    } catch (error) {
        console.error('Error confirming verification:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
