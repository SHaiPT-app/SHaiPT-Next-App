import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('userId');

        if (!userId) {
            return NextResponse.json(
                { error: 'Missing required parameter: userId' },
                { status: 400 }
            );
        }

        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // Get active challenge
        const { data: challenge, error: challengeError } = await supabase
            .from('consistency_challenges')
            .select('*')
            .eq('user_id', userId)
            .in('status', ['active', 'grace_period'])
            .single();

        if (challengeError && challengeError.code !== 'PGRST116') {
            console.error('Failed to fetch challenge:', challengeError);
            return NextResponse.json(
                { error: 'Failed to fetch challenge status' },
                { status: 500 }
            );
        }

        if (!challenge) {
            return NextResponse.json({
                enrolled: false,
                challenge: null,
                logs: [],
            });
        }

        // Get consistency logs for the challenge
        const { data: logs, error: logsError } = await supabase
            .from('consistency_logs')
            .select('*')
            .eq('challenge_id', challenge.id)
            .order('date', { ascending: false });

        if (logsError) {
            console.error('Failed to fetch logs:', logsError);
        }

        // Calculate stats
        const completedWorkouts = (logs || []).filter(log => log.completed).length;
        const scheduledWorkouts = (logs || []).filter(log => log.scheduled).length;

        // Calculate current streak
        let currentStreak = 0;
        const sortedLogs = [...(logs || [])].sort((a, b) =>
            new Date(b.date).getTime() - new Date(a.date).getTime()
        );
        for (const log of sortedLogs) {
            if (log.completed) {
                currentStreak++;
            } else if (log.scheduled) {
                break;
            }
        }

        return NextResponse.json({
            enrolled: true,
            challenge,
            logs: logs || [],
            stats: {
                completedWorkouts,
                scheduledWorkouts,
                currentStreak,
                weeksCompleted: challenge.weeks_completed,
                missedThisWeek: challenge.missed_days_this_week,
            },
        });
    } catch (error) {
        console.error('Error fetching challenge status:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
