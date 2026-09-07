/**
 * Legacy workout log endpoint used by PlanViewer (POST) and TraineeDashboard (GET).
 * Rows live in the canonical workout_logs + exercise_logs tables; the response keeps the
 * denormalised `{ ...workoutLog, exercises: [{ exercise_id, name, sets }] }` shape those
 * components expect. The caller is always the log owner (auth.user.id).
 */
import { NextResponse } from 'next/server';
import { getUser, isErrorResponse } from '@/lib/auth';

interface ClientSet {
    setNumber?: number;
    set_number?: number;
    reps?: number | string;
    weight?: number | string;
    weight_unit?: 'lbs' | 'kg';
    duration?: number;
    duration_seconds?: number;
    rpe?: number;
    isPr?: boolean;
    is_pr?: boolean;
}

interface ClientExercise {
    exerciseId?: string;
    exercise_id?: string;
    name?: string;
    sets?: ClientSet[];
    comments?: string;
}

interface ExerciseLogRow {
    exercise_id: string;
    exercise_order?: number | null;
    sets: StoredSet[] | null;
    notes?: string | null;
    [key: string]: unknown;
}

interface WorkoutLogRow {
    id: string;
    exercise_logs?: ExerciseLogRow[] | null;
    [key: string]: unknown;
}

interface StoredSet {
    set_number: number;
    reps: number;
    weight: number;
    weight_unit: 'lbs' | 'kg';
    duration_seconds?: number;
    rpe?: number;
    is_pr?: boolean;
}

function toNumber(value: unknown): number {
    const n = typeof value === 'string' ? parseFloat(value) : Number(value);
    return Number.isFinite(n) ? n : 0;
}

function normaliseSets(sets: ClientSet[] | undefined): StoredSet[] {
    return (Array.isArray(sets) ? sets : []).map((s, i) => ({
        set_number: s.set_number ?? s.setNumber ?? i + 1,
        reps: toNumber(s.reps),
        weight: toNumber(s.weight),
        weight_unit: s.weight_unit === 'kg' ? 'kg' : 'lbs',
        ...(s.duration_seconds ?? s.duration ? { duration_seconds: toNumber(s.duration_seconds ?? s.duration) } : {}),
        ...(s.rpe !== undefined ? { rpe: s.rpe } : {}),
        ...(s.is_pr || s.isPr ? { is_pr: true } : {}),
    }));
}

/** exercise_logs row -> the inline exercise shape the dashboard renders. */
function denormaliseExercise(row: ExerciseLogRow) {
    const sets: StoredSet[] = Array.isArray(row.sets) ? row.sets : [];
    return {
        exercise_id: row.exercise_id,
        name: row.notes || row.exercise_id,
        sets: sets.map((s) => ({
            weight: s.weight,
            reps: s.reps,
            weight_unit: s.weight_unit,
            rpe: s.rpe,
            isPr: s.is_pr === true,
        })),
    };
}

export async function POST(request: Request) {
    const auth = await getUser(request);
    if (isErrorResponse(auth)) return auth;

    try {
        const logData = await request.json();
        // plan_id / trainee_id / session_id from the body are ignored: legacy plan sessions are
        // not workout_sessions rows, and the log always belongs to the caller.
        const exercises: ClientExercise[] = Array.isArray(logData.exercises) ? logData.exercises : [];
        const now = new Date().toISOString();

        const { data: workoutLog, error } = await auth.supabase
            .from('workout_logs')
            .insert({
                user_id: auth.user.id,
                date: now.split('T')[0],
                started_at: logData.started_at || now,
                finished_at: now,
                completed_at: now,
                notes: logData.notes ?? null,
            })
            .select()
            .single();

        if (error) {
            console.error('Workout log creation error:', error);
            throw error;
        }

        const exerciseRows = exercises.map((ex, i) => {
            const sets = normaliseSets(ex.sets);
            const exerciseId = ex.exercise_id || ex.exerciseId || ex.name || `exercise-${i + 1}`;
            return {
                workout_log_id: workoutLog.id,
                exercise_id: exerciseId,
                exercise_order: i + 1,
                sets,
                total_sets: sets.length,
                total_reps: sets.reduce((sum, s) => sum + s.reps, 0),
                max_weight: sets.length ? Math.max(...sets.map((s) => s.weight)) : null,
                // display name (legacy plans carry client-side ids, not library ids) and the trainee's comments
                notes: ex.name || null,
                exercise_notes: ex.comments || null,
            };
        });

        let exerciseLogs: ExerciseLogRow[] = [];
        if (exerciseRows.length > 0) {
            const { data, error: exError } = await auth.supabase
                .from('exercise_logs')
                .insert(exerciseRows)
                .select();
            if (exError) {
                console.error('Exercise log creation error:', exError);
                throw exError;
            }
            exerciseLogs = data || [];
        }

        return NextResponse.json(
            { log: { ...workoutLog, exercises: exerciseLogs.map(denormaliseExercise) } },
            { status: 201 }
        );
    } catch (error: unknown) {
        console.error('POST logs error:', error);
        const message = error instanceof Error ? error.message : (error as { message?: string })?.message;
        return NextResponse.json({ error: message || 'Internal server error' }, { status: 500 });
    }
}

// `traineeId` in the query is ignored: the caller only ever gets their own logs.
export async function GET(request: Request) {
    const auth = await getUser(request);
    if (isErrorResponse(auth)) return auth;

    try {
        const { data, error } = await auth.supabase
            .from('workout_logs')
            .select('*, exercise_logs(*)')
            .eq('user_id', auth.user.id)
            .order('date', { ascending: false });

        if (error) {
            console.error('Logs fetch error:', error);
            throw error;
        }

        const logs = ((data || []) as WorkoutLogRow[]).map((row) => {
            const { exercise_logs, ...log } = row;
            const rows = Array.isArray(exercise_logs) ? [...exercise_logs] : [];
            rows.sort((a, b) => (a.exercise_order ?? 0) - (b.exercise_order ?? 0));
            return { ...log, exercises: rows.map(denormaliseExercise) };
        });

        return NextResponse.json({ logs });
    } catch (error: unknown) {
        console.error('Get logs error:', error);
        const message = error instanceof Error ? error.message : (error as { message?: string })?.message;
        return NextResponse.json({ error: message || 'Internal server error' }, { status: 500 });
    }
}
