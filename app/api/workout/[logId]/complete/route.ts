import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ logId: string }> }
) {
    try {
        const { logId } = await params;
        const body = await request.json();

        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        const finishedAt = body.finishedAt || new Date().toISOString();

        // Update workout log
        const { data: workoutLog, error: updateError } = await supabase
            .from('workout_logs')
            .update({
                finished_at: finishedAt,
                completed_at: finishedAt,
                notes: body.notes,
            })
            .eq('id', logId)
            .select()
            .single();

        if (updateError) {
            console.error('Failed to complete workout:', updateError);
            return NextResponse.json(
                { error: 'Failed to complete workout' },
                { status: 500 }
            );
        }

        // Get all exercise logs for this workout
        const { data: exerciseLogs, error: logsError } = await supabase
            .from('exercise_logs')
            .select('*')
            .eq('workout_log_id', logId);

        if (logsError) {
            console.error('Failed to fetch exercise logs:', logsError);
        }

        // Calculate summary stats
        let totalSets = 0;
        let totalReps = 0;
        let totalVolume = 0;
        let totalRest = 0;

        if (exerciseLogs) {
            for (const log of exerciseLogs) {
                const sets = log.sets || [];
                totalSets += sets.length;
                for (const set of sets) {
                    if (set.set_type !== 'warmup') {
                        totalReps += set.reps || 0;
                        totalVolume += (set.weight || 0) * (set.reps || 0);
                    }
                    totalRest += set.actual_rest_seconds || 0;
                }
            }
        }

        // Update workout log with totals
        await supabase
            .from('workout_logs')
            .update({
                total_rest_seconds: totalRest,
            })
            .eq('id', logId);

        // Update consistency log if user has an active challenge
        if (workoutLog.user_id) {
            const { data: challenge } = await supabase
                .from('consistency_challenges')
                .select('*')
                .eq('user_id', workoutLog.user_id)
                .in('status', ['active', 'grace_period'])
                .single();

            if (challenge) {
                await supabase
                    .from('consistency_logs')
                    .upsert({
                        user_id: workoutLog.user_id,
                        challenge_id: challenge.id,
                        date: workoutLog.date,
                        completed: true,
                        workout_log_id: logId,
                        completion_percentage: 100,
                    }, { onConflict: 'user_id,date' });
            }
        }

        // Delete any draft for this session
        if (workoutLog.session_id) {
            await supabase
                .from('workout_drafts')
                .delete()
                .eq('user_id', workoutLog.user_id)
                .eq('session_id', workoutLog.session_id);
        }

        return NextResponse.json({
            workout_log: workoutLog,
            summary: {
                total_sets: totalSets,
                total_reps: totalReps,
                total_volume: totalVolume,
                total_rest_seconds: totalRest,
            },
        });
    } catch (error) {
        console.error('Error completing workout:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
