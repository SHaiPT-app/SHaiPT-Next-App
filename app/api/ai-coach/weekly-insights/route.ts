import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextRequest } from 'next/server';

interface WeeklyInsightsRequest {
    userId: string;
    workoutLogs: Array<{
        date: string;
        exercises: Array<{
            name: string;
            sets: Array<{
                weight: number;
                reps: number;
                weight_unit: string;
                rpe?: number;
            }>;
        }>;
        durationMinutes?: number;
    }>;
    plannedWorkouts?: number;
    previousWeekData?: {
        exercises: Array<{
            name: string;
            maxWeight: number;
            totalVolume: number;
        }>;
    };
    userGoals?: string[];
}

const MOCK_INSIGHT = {
    adherence: {
        planned_workouts: 4,
        completed_workouts: 3,
        adherence_percentage: 75,
        summary:
            'You completed 3 out of 4 planned workouts this week. Missing one session is manageable, but consistency is key for long-term progress.',
    },
    strength_trends: {
        trending_up: ['Bench Press', 'Squat'],
        trending_down: [],
        summary:
            'Your bench press and squat numbers are showing steady improvement. Upper body pressing strength has been particularly strong over the past few weeks.',
    },
    plateaus: {
        exercises: ['Overhead Press'],
        summary:
            'Your overhead press has stalled at the same weight for 3 weeks. Consider incorporating accessory work like lateral raises and face pulls.',
    },
    recommendations: [
        'Add 5 lbs to your bench press working sets next week based on your current RPE trends',
        'Include a dedicated overhead press accessory day to break through the plateau',
        'Prioritize hitting all 4 planned sessions next week to maintain momentum',
    ],
    overall_summary:
        'Solid week overall with good strength gains in key lifts. Adherence was slightly below target. Focus on consistency and addressing the overhead press plateau to keep progressing.',
};

function getWeekDates(): { weekStart: string; weekEnd: string } {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const monday = new Date(now);
    monday.setDate(now.getDate() - ((dayOfWeek + 6) % 7));
    monday.setHours(0, 0, 0, 0);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    return {
        weekStart: monday.toISOString().split('T')[0],
        weekEnd: sunday.toISOString().split('T')[0],
    };
}

export async function POST(req: NextRequest) {
    try {
        const body: WeeklyInsightsRequest = await req.json();
        const { userId, workoutLogs, plannedWorkouts, previousWeekData, userGoals } = body;

        if (!userId) {
            return new Response(
                JSON.stringify({ error: 'User ID is required' }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            );
        }

        const { weekStart, weekEnd } = getWeekDates();

        const completedWorkouts = workoutLogs?.length ?? 0;
        const planned = plannedWorkouts ?? 4;

        // Build exercise summary for the prompt
        const exerciseSummary = (workoutLogs ?? [])
            .flatMap((log) =>
                log.exercises.map((ex) => {
                    const maxWeight = Math.max(...ex.sets.map((s) => s.weight));
                    const totalVolume = ex.sets.reduce(
                        (sum, s) => sum + s.weight * s.reps,
                        0
                    );
                    return { name: ex.name, maxWeight, totalVolume };
                })
            )
            .reduce(
                (acc, ex) => {
                    const existing = acc.find((e) => e.name === ex.name);
                    if (existing) {
                        existing.maxWeight = Math.max(existing.maxWeight, ex.maxWeight);
                        existing.totalVolume += ex.totalVolume;
                    } else {
                        acc.push({ ...ex });
                    }
                    return acc;
                },
                [] as Array<{ name: string; maxWeight: number; totalVolume: number }>
            );

        const previousComparison = previousWeekData?.exercises
            ? previousWeekData.exercises
                  .map((prev) => {
                      const current = exerciseSummary.find(
                          (e) => e.name === prev.name
                      );
                      if (!current) return null;
                      const weightChange = current.maxWeight - prev.maxWeight;
                      const volumeChange = current.totalVolume - prev.totalVolume;
                      return `${prev.name}: weight ${weightChange >= 0 ? '+' : ''}${weightChange} lbs, volume ${volumeChange >= 0 ? '+' : ''}${volumeChange}`;
                  })
                  .filter(Boolean)
                  .join('\n')
            : 'No previous week data available.';

        const prompt = `You are SHaiPT AI Coach. Generate a weekly progress report for this trainee.

Week: ${weekStart} to ${weekEnd}
Workouts Completed: ${completedWorkouts} out of ${planned} planned
${userGoals?.length ? `Goals: ${userGoals.join(', ')}` : ''}

Exercise Performance This Week:
${exerciseSummary.map((e) => `- ${e.name}: Max ${e.maxWeight} lbs, Total Volume ${e.totalVolume} lbs`).join('\n')}

Week-over-Week Comparison:
${previousComparison}

Respond with a JSON object containing these fields:
1. "adherence": { "planned_workouts": number, "completed_workouts": number, "adherence_percentage": number, "summary": string (1-2 sentences) }
2. "strength_trends": { "trending_up": string[] (exercise names improving), "trending_down": string[] (exercise names declining), "summary": string (1-2 sentences) }
3. "plateaus": { "exercises": string[] (exercises that have stalled), "summary": string (1-2 sentences with suggestions) }
4. "recommendations": string[] (exactly 3 actionable recommendations)
5. "overall_summary": string (2-3 sentence overview of the week)

Be direct and constructive. No emojis. JSON only, no markdown code fences.`;

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return new Response(
                JSON.stringify({
                    id: `insight-mock-${Date.now()}`,
                    user_id: userId,
                    week_start: weekStart,
                    week_end: weekEnd,
                    ...MOCK_INSIGHT,
                    generated_at: new Date().toISOString(),
                }),
                { status: 200, headers: { 'Content-Type': 'application/json' } }
            );
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

        const result = await model.generateContent(prompt);
        const text = result.response.text();

        let parsed;
        try {
            const cleaned = text
                .replace(/```json\n?/g, '')
                .replace(/```\n?/g, '')
                .trim();
            parsed = JSON.parse(cleaned);
        } catch {
            parsed = MOCK_INSIGHT;
        }

        return new Response(
            JSON.stringify({
                id: `insight-${Date.now()}`,
                user_id: userId,
                week_start: weekStart,
                week_end: weekEnd,
                ...parsed,
                generated_at: new Date().toISOString(),
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
    } catch (error: unknown) {
        console.error('Weekly insights AI error:', error);

        const err = error as { status?: number; message?: string };
        if (err?.status === 429 || err?.message?.includes('429')) {
            return new Response(
                JSON.stringify({ error: 'Rate limited. Please try again shortly.' }),
                { status: 429, headers: { 'Content-Type': 'application/json' } }
            );
        }

        const message =
            error instanceof Error
                ? error.message
                : 'Failed to generate weekly insights';
        return new Response(JSON.stringify({ error: message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}
