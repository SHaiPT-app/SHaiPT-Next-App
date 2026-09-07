import { NextRequest, NextResponse } from 'next/server';
import { getUser, isErrorResponse } from '@/lib/auth';

// `user_id` in the body is ignored: the caller enrols themself.
export async function POST(request: NextRequest) {
    const auth = await getUser(request);
    if (isErrorResponse(auth)) return auth;

    try {
        const supabase = auth.supabase;
        const userId = auth.user.id;

        // Check if user already has an active challenge
        const { data: existingChallenge } = await supabase
            .from('consistency_challenges')
            .select('*')
            .eq('user_id', userId)
            .in('status', ['active', 'grace_period'])
            .maybeSingle();

        if (existingChallenge) {
            return NextResponse.json(
                { error: 'User already has an active challenge' },
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
                user_id: userId,
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
