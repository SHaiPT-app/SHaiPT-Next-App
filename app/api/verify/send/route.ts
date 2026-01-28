import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { user_id, phone_number } = body;

        if (!user_id || !phone_number) {
            return NextResponse.json(
                { error: 'Missing required fields: user_id, phone_number' },
                { status: 400 }
            );
        }

        // Validate phone number format
        const cleanPhone = phone_number.replace(/\D/g, '');
        if (cleanPhone.length < 10 || cleanPhone.length > 15) {
            return NextResponse.json(
                { error: 'Invalid phone number format' },
                { status: 400 }
            );
        }

        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // Generate 6-digit code
        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

        // Code expires in 10 minutes
        const expiresAt = new Date();
        expiresAt.setMinutes(expiresAt.getMinutes() + 10);

        // Store verification record
        const { data: verification, error } = await supabase
            .from('phone_verifications')
            .upsert({
                user_id,
                phone_number: cleanPhone,
                verification_code: verificationCode,
                expires_at: expiresAt.toISOString(),
                attempts: 0,
                verified_at: null,
            }, { onConflict: 'user_id' })
            .select()
            .single();

        if (error) {
            console.error('Failed to create verification:', error);
            return NextResponse.json(
                { error: 'Failed to send verification code' },
                { status: 500 }
            );
        }

        // TODO: Integrate with SMS provider (Twilio, etc.)
        // For now, in development, log the code
        console.log(`[DEV] Verification code for ${cleanPhone}: ${verificationCode}`);

        // In production, uncomment and configure SMS sending:
        // await sendSMS(cleanPhone, `Your SHaiPT verification code is: ${verificationCode}`);

        return NextResponse.json({
            success: true,
            message: 'Verification code sent',
            // Remove in production:
            debug_code: process.env.NODE_ENV === 'development' ? verificationCode : undefined,
        });
    } catch (error) {
        console.error('Error sending verification:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
