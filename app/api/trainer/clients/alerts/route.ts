import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getClientAlerts, type FormIssueEntry } from '@/lib/aiClientAlerts';
import type { ClientAlertSummary } from '@/lib/types';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const trainerId = searchParams.get('trainerId');

        if (!trainerId) {
            return NextResponse.json({ error: 'trainerId is required' }, { status: 400 });
        }

        const authHeader = request.headers.get('Authorization');
        if (!authHeader) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // 1. Get active coaching relationships for this trainer
        const { data: relationships, error: relError } = await supabase
            .from('coaching_relationships')
            .select('athlete_id')
            .eq('coach_id', trainerId)
            .eq('status', 'active');

        if (relError) throw relError;
        if (!relationships || relationships.length === 0) {
            return NextResponse.json({ alerts: [] });
        }

        const athleteIds = relationships.map(r => r.athlete_id);

        // 2. Get workout logs for all athletes (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0];

        const { data: workoutLogs, error: logsError } = await supabase
            .from('workout_logs')
            .select('id, user_id, date, completed_at')
            .in('user_id', athleteIds)
            .gte('date', thirtyDaysAgoStr)
            .order('date', { ascending: false });

        if (logsError) throw logsError;

        // 3. Get exercise logs for recent workouts (for plateau detection)
        const workoutLogIds = (workoutLogs || []).map(wl => wl.id);
        let exerciseLogsWithDates: Array<{
            id: string;
            workout_log_id: string;
            exercise_id: string;
            exercise_order: number;
            sets: unknown[];
            total_sets?: number;
            total_reps?: number;
            max_weight?: number;
            average_rest_seconds?: number;
            created_at?: string;
            workout_date: string;
        }> = [];

        if (workoutLogIds.length > 0) {
            const { data: exerciseLogs, error: exError } = await supabase
                .from('exercise_logs')
                .select('*')
                .in('workout_log_id', workoutLogIds);

            if (exError) throw exError;

            // Map workout_log_id -> date for enrichment
            const logDateMap = new Map<string, string>();
            for (const wl of workoutLogs || []) {
                logDateMap.set(wl.id, wl.date);
            }

            exerciseLogsWithDates = (exerciseLogs || []).map(el => ({
                ...el,
                workout_date: logDateMap.get(el.workout_log_id) || '',
            }));
        }

        // 4. Build alerts per athlete
        // Note: form issues would come from a dedicated table in a full implementation.
        // For now, we pass an empty array since form issues are detected in real-time
        // during pose analysis sessions and would need to be stored separately.
        const now = new Date();
        const alertSummaries: ClientAlertSummary[] = [];

        for (const athleteId of athleteIds) {
            const clientWorkoutLogs = (workoutLogs || []).filter(wl => wl.user_id === athleteId);
            const clientExerciseLogs = exerciseLogsWithDates.filter(
                el => clientWorkoutLogs.some(wl => wl.id === el.workout_log_id)
            );

            // Form issues: check if there's a form_issues table, otherwise empty
            const formIssues: FormIssueEntry[] = [];

            const alerts = getClientAlerts(
                athleteId,
                clientWorkoutLogs,
                clientExerciseLogs,
                formIssues,
                now
            );

            if (alerts.length > 0) {
                alertSummaries.push({
                    clientId: athleteId,
                    alerts,
                    totalCount: alerts.length,
                });
            }
        }

        return NextResponse.json({ alerts: alertSummaries });
    } catch (error: unknown) {
        console.error('Fetch trainer client alerts error:', error);
        const message = error instanceof Error ? error.message : 'Internal Server Error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
