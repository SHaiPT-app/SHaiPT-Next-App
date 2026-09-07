import { NextRequest, NextResponse } from 'next/server';
import { isErrorResponse, requireTrainer } from '@/lib/auth';
import type { ClientAlert, ClientAlertSummary } from '@/lib/types';

/** Inactivity alerts for the caller's active clients (reads run as the coach under RLS). */
export async function GET(req: NextRequest) {
    try {
        const auth = await requireTrainer(req);
        if (isErrorResponse(auth)) return auth;
        const sb = auth.supabase;
        const trainerId = auth.user.id;

        // Get active coaching relationships
        const { data: relationships, error: relError } = await sb
            .from('coaching_relationships')
            .select('athlete_id')
            .eq('coach_id', trainerId)
            .eq('status', 'active');

        if (relError) throw relError;
        if (!relationships || relationships.length === 0) {
            return NextResponse.json({ alerts: [] });
        }

        const athleteIds = relationships.map(r => r.athlete_id);

        // Get workout logs for last 14 days for inactivity detection
        const fourteenDaysAgo = new Date();
        fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
        const cutoff = fourteenDaysAgo.toISOString().split('T')[0];

        const { data: workoutLogs } = await sb
            .from('workout_logs')
            .select('user_id, date')
            .in('user_id', athleteIds)
            .gte('date', cutoff)
            .order('date', { ascending: false });

        // Generate simple alerts: inactivity (no workout in 7+ days)
        const now = new Date();
        const alertSummaries: ClientAlertSummary[] = [];

        for (const athleteId of athleteIds) {
            const clientLogs = (workoutLogs || []).filter(l => l.user_id === athleteId);
            const alerts: ClientAlert[] = [];

            if (clientLogs.length === 0) {
                alerts.push({
                    type: 'missed_workouts',
                    severity: 'critical',
                    title: 'Inactive',
                    message: 'No workouts in the last 14 days',
                    clientId: athleteId,
                    detectedAt: now.toISOString(),
                });
            } else {
                const lastDate = new Date(clientLogs[0].date + 'T00:00:00');
                const daysSince = Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
                if (daysSince >= 7) {
                    alerts.push({
                        type: 'missed_workouts',
                        severity: 'warning',
                        title: 'Low Activity',
                        message: `No workouts in ${daysSince} days`,
                        clientId: athleteId,
                        detectedAt: now.toISOString(),
                    });
                }
            }

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
