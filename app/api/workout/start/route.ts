import { NextRequest, NextResponse } from 'next/server';
import { getUser, isErrorResponse } from '@/lib/auth';

export async function POST(request: NextRequest) {
    const auth = await getUser(request);
    if (isErrorResponse(auth)) return auth;

    try {
        const body = await request.json();
        // user_id in the body is ignored: the log belongs to the caller.
        const { session_id, assignment_id, date, exercises } = body;

        if (!session_id) {
            return NextResponse.json(
                { error: 'Missing required field: session_id' },
                { status: 400 }
            );
        }

        const supabase = auth.supabase;

        // Create workout log
        const { data: workoutLog, error: logError } = await supabase
            .from('workout_logs')
            .insert({
                user_id: auth.user.id,
                session_id,
                assignment_id,
                date: date || new Date().toISOString().split('T')[0],
                started_at: new Date().toISOString(),
            })
            .select()
            .single();

        if (logError) {
            console.error('Failed to create workout log:', logError);
            return NextResponse.json(
                { error: 'Failed to create workout log' },
                { status: 500 }
            );
        }

        // Create exercise logs if provided
        const exerciseLogs = [];
        const failedExercises: string[] = [];
        if (exercises && Array.isArray(exercises)) {
            for (let i = 0; i < exercises.length; i++) {
                const exercise = exercises[i];
                const { data: exerciseLog, error: exerciseError } = await supabase
                    .from('exercise_logs')
                    .insert({
                        workout_log_id: workoutLog.id,
                        exercise_id: exercise.exercise_id,
                        exercise_order: i + 1, // 1-based to match client-side convention
                        sets: [],
                    })
                    .select()
                    .single();

                if (exerciseError) {
                    console.error('Failed to create exercise log:', exerciseError);
                    failedExercises.push(exercise.exercise_id);
                } else {
                    exerciseLogs.push(exerciseLog);
                }
            }
        }

        return NextResponse.json({
            workout_log: workoutLog,
            exercise_logs: exerciseLogs,
            ...(failedExercises.length > 0 ? { warnings: { failed_exercises: failedExercises } } : {}),
        });
    } catch (error) {
        console.error('Error starting workout:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
