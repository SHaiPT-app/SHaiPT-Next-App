import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { user_id } = body;

        if (!user_id) {
            return NextResponse.json(
                { error: 'Missing required field: user_id' },
                { status: 400 }
            );
        }

        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // Check if user already has an active challenge
        const { data: existingChallenge } = await supabase
            .from('consistency_challenges')
            .select('*')
            .eq('user_id', user_id)
            .in('status', ['active', 'grace_period'])
            .single();

        if (existingChallenge) {
            return NextResponse.json(
                { error: 'User already has an active challenge' },
                { status: 400 }
            );
        }

        // Check if user has phone verified (required for challenge)
        const { data: profile } = await supabase
            .from('profiles')
            .select('phone_verified')
            .eq('id', user_id)
            .single();

        if (!profile?.phone_verified) {
            return NextResponse.json(
                { error: 'Phone verification required to enroll' },
                { status: 400 }
            );
        }

        // Get the start of current week (Monday)
        const today = new Date();
        const dayOfWeek = today.getDay();
        const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
        const weekStart = new Date(today.setDate(diff));
        weekStart.setHours(0, 0, 0, 0);

        // Create new challenge
        const { data: challenge, error } = await supabase
            .from('consistency_challenges')
            .insert({
                user_id,
                status: 'active',
                current_week_start: weekStart.toISOString().split('T')[0],
                weeks_completed: 0,
                missed_days_this_week: 0,
            })
            .select()
            .single();

        if (error) {
            console.error('Failed to create challenge:', error);
            return NextResponse.json(
                { error: 'Failed to enroll in challenge' },
                { status: 500 }
            );
        }

        return NextResponse.json({ challenge });
    } catch (error) {
        console.error('Error enrolling in challenge:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
