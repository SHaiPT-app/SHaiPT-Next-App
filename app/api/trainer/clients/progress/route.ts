import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabase(req: NextRequest) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    if (serviceKey) {
        return createClient(supabaseUrl, serviceKey, {
            auth: { autoRefreshToken: false, persistSession: false }
        });
    }
    const token = req.headers.get('Authorization')?.replace('Bearer ', '');
    return createClient(supabaseUrl, anonKey, {
        global: token ? { headers: { Authorization: `Bearer ${token}` } } : undefined,
        auth: { autoRefreshToken: false, persistSession: false }
    });
}

export async function GET(req: NextRequest) {
    try {
        const sb = getSupabase(req);
        const { searchParams } = new URL(req.url);
        const trainerId = searchParams.get('trainerId');
        const clientId = searchParams.get('clientId');

        if (!trainerId || !clientId) {
            return NextResponse.json(
                { error: 'trainerId and clientId are required' },
                { status: 400 }
            );
        }

        // Verify active coaching relationship and get permission flags
        const { data: relationship, error: relError } = await sb
            .from('coaching_relationships')
            .select('*')
            .eq('coach_id', trainerId)
            .eq('athlete_id', clientId)
            .eq('status', 'active')
            .single();

        if (relError) {
            console.error('Coaching relationship query error:', relError);
            return NextResponse.json(
                { error: `Coaching relationship error: ${relError.message}` },
                { status: 403 }
            );
        }
        if (!relationship) {
            return NextResponse.json(
                { error: 'No active coaching relationship found' },
                { status: 403 }
            );
        }

        const canViewWorkouts = relationship.can_view_workouts ?? true;

        // Build response based on permission flags
        const result: {
            client: Record<string, unknown> | null;
            workoutLogs: unknown[];
            bodyMeasurements: unknown[];
            progressMedia: unknown[];
            permissions: { can_view_workouts: boolean; can_assign_plans: boolean };
        } = {
            client: null,
            workoutLogs: [],
            bodyMeasurements: [],
            progressMedia: [],
            permissions: {
                can_view_workouts: canViewWorkouts,
                can_assign_plans: relationship.can_assign_plans ?? true,
            },
        };

        // Fetch client profile
        const { data: profile } = await sb
            .from('profiles')
            .select('id, email, username, full_name, avatar_url, role')
            .eq('id', clientId)
            .single();

        result.client = profile;

        if (!canViewWorkouts) {
            return NextResponse.json(result);
        }

        // Fetch workout logs with exercise logs
        const { data: workoutLogs, error: logsError } = await sb
            .from('workout_logs')
            .select('*')
            .eq('user_id', clientId)
            .order('date', { ascending: false })
            .limit(50);

        if (logsError) throw logsError;

        // Fetch exercise logs for the workout logs
        if (workoutLogs && workoutLogs.length > 0) {
            const logIds = workoutLogs.map(l => l.id);
            const { data: exerciseLogs, error: exError } = await sb
                .from('exercise_logs')
                .select('*')
                .in('workout_log_id', logIds);

            if (exError) throw exError;

            // Attach exercise logs to their workout logs
            result.workoutLogs = workoutLogs.map(log => ({
                ...log,
                exercise_logs: (exerciseLogs || []).filter(
                    el => el.workout_log_id === log.id
                ),
            }));
        }

        // Fetch body measurements (table may not exist)
        try {
            const { data: measurements } = await sb
                .from('body_measurements')
                .select('*')
                .eq('user_id', clientId)
                .order('date', { ascending: false });
            result.bodyMeasurements = measurements || [];
        } catch {
            // Table may not exist — skip
        }

        // Fetch progress media (table may not exist)
        try {
            const { data: media } = await sb
                .from('progress_media')
                .select('*')
                .eq('user_id', clientId)
                .in('visibility', ['public', 'followers'])
                .order('taken_at', { ascending: false });

            if (media && media.length > 0) {
                const mediaWithUrls = await Promise.all(
                    media.map(async (item) => {
                        const { data } = await sb.storage
                            .from('progress-media')
                            .createSignedUrl(item.storage_path, 3600);
                        return { ...item, url: data?.signedUrl || null };
                    })
                );
                result.progressMedia = mediaWithUrls;
            }
        } catch {
            // Table may not exist — skip
        }

        return NextResponse.json(result);
    } catch (error: unknown) {
        console.error('Fetch client progress error:', error);
        const message = error instanceof Error ? error.message : 'Internal Server Error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
