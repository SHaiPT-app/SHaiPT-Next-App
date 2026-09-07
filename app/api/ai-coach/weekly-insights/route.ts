/**
 * POST /api/ai-coach/weekly-insights → WeeklyInsight
 * One gated call per user per week: the prompt embeds the week's dates, so the 7-day cache in
 * the gateway returns the same insight until the week changes.
 */
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getUser, isErrorResponse, getProfileBits } from '@/lib/auth';
import { callModel, limitResponse } from '@/lib/ai/gateway';

interface WeeklyInsightsRequest {
    workoutLogs: Array<{
        date: string;
        exercises: Array<{ name: string; sets: Array<{ weight: number; reps: number; weight_unit: string; rpe?: number }> }>;
        durationMinutes?: number;
    }>;
    plannedWorkouts?: number;
    previousWeekData?: { exercises: Array<{ name: string; maxWeight: number; totalVolume: number }> };
    userGoals?: string[];
}

const InsightSchema = z.object({
    adherence: z.object({
        planned_workouts: z.number(),
        completed_workouts: z.number(),
        adherence_percentage: z.number(),
        summary: z.string(),
    }),
    strength_trends: z.object({
        trending_up: z.array(z.string()),
        trending_down: z.array(z.string()),
        summary: z.string(),
    }),
    plateaus: z.object({ exercises: z.array(z.string()), summary: z.string() }),
    recommendations: z.array(z.string()).min(1).max(5),
    overall_summary: z.string(),
});

function mockInsight(planned: number, completed: number): z.infer<typeof InsightSchema> {
    return {
        adherence: {
            planned_workouts: planned,
            completed_workouts: completed,
            adherence_percentage: planned ? Math.round((completed / planned) * 100) : 0,
            summary: `You completed ${completed} of ${planned} planned workouts this week. Consistency is what moves the numbers.`,
        },
        strength_trends: { trending_up: [], trending_down: [], summary: 'Log a couple more weeks and the trends will show up here.' },
        plateaus: { exercises: [], summary: 'No plateaus to report yet.' },
        recommendations: [
            'Hit every planned session next week before adding anything new',
            'Add the smallest increment to your main lifts when all sets feel like RPE 7 or less',
            'Sleep and protein first: recovery is where the progress happens',
        ],
        overall_summary: 'A normal week. Keep showing up and the plan does the rest.',
    };
}

function getWeekDates(): { weekStart: string; weekEnd: string } {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const monday = new Date(now);
    monday.setDate(now.getDate() - ((dayOfWeek + 6) % 7));
    monday.setHours(0, 0, 0, 0);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    return { weekStart: monday.toISOString().split('T')[0], weekEnd: sunday.toISOString().split('T')[0] };
}

export async function POST(req: Request) {
    const auth = await getUser(req);
    if (isErrorResponse(auth)) return auth;
    const userId = auth.user.id;

    try {
        const body: WeeklyInsightsRequest = await req.json();
        const { workoutLogs, plannedWorkouts, previousWeekData, userGoals } = body;
        const { weekStart, weekEnd } = getWeekDates();
        const completedWorkouts = workoutLogs?.length ?? 0;
        const planned = plannedWorkouts ?? 4;

        const exerciseSummary = (workoutLogs ?? [])
            .flatMap((log) => log.exercises.map((ex) => {
                const maxWeight = Math.max(0, ...ex.sets.map((s) => s.weight));
                const totalVolume = ex.sets.reduce((sum, s) => sum + s.weight * s.reps, 0);
                return { name: ex.name, maxWeight, totalVolume };
            }))
            .reduce((acc, ex) => {
                const existing = acc.find((e) => e.name === ex.name);
                if (existing) {
                    existing.maxWeight = Math.max(existing.maxWeight, ex.maxWeight);
                    existing.totalVolume += ex.totalVolume;
                } else acc.push({ ...ex });
                return acc;
            }, [] as Array<{ name: string; maxWeight: number; totalVolume: number }>)
            .slice(0, 25);

        const previousComparison = previousWeekData?.exercises
            ? previousWeekData.exercises.slice(0, 25).map((prev) => {
                const current = exerciseSummary.find((e) => e.name === prev.name);
                if (!current) return null;
                const weightChange = current.maxWeight - prev.maxWeight;
                const volumeChange = current.totalVolume - prev.totalVolume;
                return `${prev.name}: weight ${weightChange >= 0 ? '+' : ''}${weightChange}, volume ${volumeChange >= 0 ? '+' : ''}${volumeChange}`;
            }).filter(Boolean).join('\n')
            : 'No previous week data available.';

        const prompt = `You are SHaiPT AI Coach. Generate a weekly progress report for this trainee.

Week: ${weekStart} to ${weekEnd}
Workouts Completed: ${completedWorkouts} out of ${planned} planned
${userGoals?.length ? `Goals: ${userGoals.join(', ')}` : ''}

Exercise Performance This Week:
${exerciseSummary.map((e) => `- ${e.name}: Max ${e.maxWeight}, Total Volume ${e.totalVolume}`).join('\n') || '- no workouts logged'}

Week-over-Week Comparison:
${previousComparison}

Fill adherence (planned_workouts ${planned}, completed_workouts ${completedWorkouts}), strength_trends, plateaus, exactly 3 recommendations and a 2-3 sentence overall_summary. Be direct and constructive. No emojis. Never give medical advice.`;

        const { tester } = await getProfileBits(auth);
        const res = await callModel({
            userId, tester, feature: 'weekly_insights', prompt, schema: InsightSchema,
            mock: () => mockInsight(planned, completedWorkouts),
        });
        const parsed = res.json ?? mockInsight(planned, completedWorkouts);
        return NextResponse.json({
            id: `insight-${weekStart}-${userId.slice(0, 8)}`,
            user_id: userId,
            week_start: weekStart,
            week_end: weekEnd,
            ...parsed,
            generated_at: new Date().toISOString(),
            cached: res.cached,
        });
    } catch (error: unknown) {
        const limited = limitResponse(error);
        if (limited) return limited;
        console.error('[ai-coach/weekly-insights]', userId, error);
        const message = error instanceof Error ? error.message : 'Failed to generate weekly insights';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
