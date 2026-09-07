import { NextRequest, NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getUser, isErrorResponse } from '@/lib/auth';

interface SetEntry {
    reps?: number;
    weight?: number;
    [key: string]: unknown;
}

interface ExerciseLogRow {
    id: string;
    workout_log_id: string;
    sets: SetEntry[] | null;
    [key: string]: unknown;
}

/**
 * Attempt to append a set with optimistic locking.
 * Uses the expected array length as a guard to detect concurrent writes.
 * Returns the updated log on success, or null if a conflict was detected.
 */
async function tryAppendSet(
    supabase: SupabaseClient,
    exerciseLogId: string,
    logId: string,
    setData: SetEntry
): Promise<{ updatedLog: ExerciseLogRow | null; conflict: boolean; error?: string }> {
    // Fetch current state (RLS: only exercise logs of the caller's own workout logs)
    const { data: exerciseLog, error: fetchError } = await supabase
        .from('exercise_logs')
        .select('id, sets, workout_log_id')
        .eq('id', exerciseLogId)
        .eq('workout_log_id', logId)
        .single();

    if (fetchError || !exerciseLog) {
        return { updatedLog: null, conflict: false, error: 'Exercise log not found' };
    }

    const currentSets: SetEntry[] = exerciseLog.sets || [];
    const expectedLength = currentSets.length;
    const updatedSets: SetEntry[] = [...currentSets, setData];

    // Conditional update: only succeed if the array length hasn't changed
    // since we read it (optimistic locking via array length guard).
    const { data: updatedLog, error: updateError } = await supabase
        .from('exercise_logs')
        .update({
            sets: updatedSets,
            total_sets: updatedSets.length,
            total_reps: updatedSets.reduce((sum, s) => sum + (s.reps || 0), 0),
            max_weight: Math.max(...updatedSets.map((s) => s.weight || 0)),
        })
        .eq('id', exerciseLogId)
        .filter('sets', 'cd', `{${expectedLength === 0 ? '' : new Array(expectedLength).fill('*').join(',')}}`)
        .select()
        .maybeSingle();

    // If updatedLog is null but no error, the filter didn't match (conflict)
    if (!updateError && !updatedLog) {
        return { updatedLog: null, conflict: true };
    }

    if (updateError) {
        return { updatedLog: null, conflict: true };
    }

    return { updatedLog, conflict: false };
}

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ logId: string }> }
) {
    const auth = await getUser(request);
    if (isErrorResponse(auth)) return auth;

    try {
        const { logId } = await params;
        const body = await request.json();
        const { exerciseLogId, setData } = body;

        if (!exerciseLogId || !setData) {
            return NextResponse.json(
                { error: 'Missing required fields: exerciseLogId, setData' },
                { status: 400 }
            );
        }

        const supabase = auth.supabase;

        // First attempt
        const result = await tryAppendSet(supabase, exerciseLogId, logId, setData);

        if (result.error) {
            return NextResponse.json(
                { error: result.error },
                { status: 404 }
            );
        }

        // If conflict detected, retry once with fresh data
        if (result.conflict) {
            // Re-fetch and retry
            const { data: freshLog, error: refetchError } = await supabase
                .from('exercise_logs')
                .select('*')
                .eq('id', exerciseLogId)
                .eq('workout_log_id', logId)
                .single();

            if (refetchError || !freshLog) {
                return NextResponse.json(
                    { error: 'Exercise log not found on retry' },
                    { status: 404 }
                );
            }

            const freshSets: SetEntry[] = freshLog.sets || [];
            const retryUpdatedSets: SetEntry[] = [...freshSets, setData as SetEntry];

            const { data: retryLog, error: retryError } = await supabase
                .from('exercise_logs')
                .update({
                    sets: retryUpdatedSets,
                    total_sets: retryUpdatedSets.length,
                    total_reps: retryUpdatedSets.reduce((sum, s) => sum + (s.reps || 0), 0),
                    max_weight: Math.max(...retryUpdatedSets.map((s) => s.weight || 0)),
                })
                .eq('id', exerciseLogId)
                .select()
                .single();

            if (retryError) {
                console.error('Failed to update exercise log on retry:', retryError);
                return NextResponse.json(
                    { error: 'Failed to log set after retry' },
                    { status: 500 }
                );
            }

            return NextResponse.json({ exercise_log: retryLog });
        }

        return NextResponse.json({ exercise_log: result.updatedLog });
    } catch (error) {
        console.error('Error logging set:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
