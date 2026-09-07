import { NextRequest, NextResponse } from 'next/server';
import { getAdmin, isErrorResponse, requireTrainer } from '@/lib/auth';

/**
 * The caller's active clients with their last workout, streak and current plan. Reads run as
 * the caller: RLS lets an active coach see the trainee's profile, workout logs and plan
 * assignments. Plan names use the service role because a trainee's self-assigned plan is not
 * readable by the coach; the ids come from assignments RLS already allowed.
 */
export async function GET(req: NextRequest) {
    try {
        const auth = await requireTrainer(req);
        if (isErrorResponse(auth)) return auth;
        const sb = auth.supabase;
        const trainerId = auth.user.id;

        // 1. Get active coaching relationships for this trainer
        const { data: relationships, error: relError } = await sb
            .from('coaching_relationships')
            .select('*')
            .eq('coach_id', trainerId)
            .eq('status', 'active');

        if (relError) throw relError;
        if (!relationships || relationships.length === 0) {
            return NextResponse.json({ clients: [] });
        }

        const athleteIds = relationships.map(r => r.athlete_id);

        // 2. Get athlete profiles
        const { data: profiles, error: profilesError } = await sb
            .from('profiles')
            .select('id, email, username, full_name, avatar_url, role')
            .in('id', athleteIds);

        if (profilesError) throw profilesError;

        // 3. Get last workout log for each athlete
        const { data: workoutLogs, error: logsError } = await sb
            .from('workout_logs')
            .select('user_id, date, completed_at')
            .in('user_id', athleteIds)
            .order('date', { ascending: false });

        if (logsError) throw logsError;

        // 4. Get active training plan assignments for each athlete
        const { data: assignments, error: assignError } = await sb
            .from('training_plan_assignments')
            .select('user_id, plan_id, is_active, start_date, end_date')
            .in('user_id', athleteIds)
            .eq('is_active', true);

        if (assignError) throw assignError;

        // 5. Get plan names for the active assignments
        const activePlanIds = (assignments || []).map(a => a.plan_id).filter(Boolean);
        let plansMap: Record<string, string> = {};
        if (activePlanIds.length > 0) {
            const { data: plans, error: plansError } = await getAdmin()
                .from('training_plans')
                .select('id, name')
                .in('id', activePlanIds);

            if (plansError) throw plansError;
            plansMap = (plans || []).reduce((acc: Record<string, string>, p) => {
                acc[p.id] = p.name;
                return acc;
            }, {});
        }

        // 6. Build client stats
        const clients = (profiles || []).map(profile => {
            const userLogs = (workoutLogs || []).filter(l => l.user_id === profile.id);
            const lastWorkoutDate = userLogs.length > 0 ? userLogs[0].date : null;

            let streak = 0;
            if (userLogs.length > 0) {
                const uniqueDates = [...new Set(userLogs.map(l => l.date))].sort().reverse();
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const yesterday = new Date(today);
                yesterday.setDate(yesterday.getDate() - 1);

                const firstDate = new Date(uniqueDates[0] + 'T00:00:00');
                if (firstDate >= yesterday) {
                    streak = 1;
                    for (let i = 1; i < uniqueDates.length; i++) {
                        const curr = new Date(uniqueDates[i] + 'T00:00:00');
                        const prev = new Date(uniqueDates[i - 1] + 'T00:00:00');
                        const diffDays = (prev.getTime() - curr.getTime()) / (1000 * 60 * 60 * 24);
                        if (diffDays === 1) {
                            streak++;
                        } else {
                            break;
                        }
                    }
                }
            }

            const userAssignment = (assignments || []).find(a => a.user_id === profile.id);
            const currentPlan = userAssignment ? (plansMap[userAssignment.plan_id] || null) : null;
            const relationship = relationships.find(r => r.athlete_id === profile.id);

            return {
                id: profile.id,
                email: profile.email,
                username: profile.username,
                full_name: profile.full_name,
                avatar_url: profile.avatar_url,
                lastWorkoutDate,
                currentPlan,
                streak,
                relationshipId: relationship?.id,
                canAssignPlans: relationship?.can_assign_plans ?? true,
                canViewWorkouts: relationship?.can_view_workouts ?? true,
            };
        });

        return NextResponse.json({ clients });
    } catch (error: unknown) {
        console.error('Fetch trainer clients error:', error);
        const message = error instanceof Error ? error.message : 'Internal Server Error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
