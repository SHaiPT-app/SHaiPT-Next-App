/**
 * POST /api/ai-coach/plan-adaptation → PlanAdaptationResponse
 * One gated call (flash, 1500 tokens). Pain reports never get coached around: the model is told
 * to send the user to a professional.
 */
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getUser, isErrorResponse, getProfileBits } from '@/lib/auth';
import { callModel, limitResponse } from '@/lib/ai/gateway';
import type { PlanAdaptationResponse } from '@/lib/types';

interface ExercisePerformance {
    exercise_name: string;
    exercise_id?: string;
    target_sets: number;
    target_reps: string;
    target_weight: string;
    actual_sets: Array<{ weight: number; reps: number; rpe?: number; weight_unit: string }>;
    pain_reported?: boolean;
    pain_notes?: string;
}

interface PlanAdaptationRequest {
    workoutLogId: string;
    sessionName: string;
    exercises: ExercisePerformance[];
    recentWorkouts?: Array<{ sessionName: string; date: string; totalVolume: number; averageRpe?: number }>;
    userGoals?: string[];
    currentPhaseType?: string;
    weekNumber?: number;
    totalPlanWeeks?: number;
    userNotes?: string;
}

const AdaptationSchema = z.object({
    summary: z.string(),
    recommendations: z.array(z.object({
        type: z.enum(['weight_progression', 'exercise_substitution', 'volume_adjustment', 'deload_recommendation']),
        exercise_name: z.string(),
        current_value: z.string(),
        recommended_value: z.string(),
        rationale: z.string(),
        substitute_exercise_name: z.string().nullable().default(null),
    })).max(8),
    overall_assessment: z.string(),
});

const NO_CHANGE: PlanAdaptationResponse = {
    summary: 'Your workout data has been recorded. Performance matched the plan, so nothing changes yet.',
    recommendations: [],
    overall_assessment: 'Continue following your current program. Adaptation recommendations appear when your numbers call for them.',
};

export async function POST(req: Request) {
    const auth = await getUser(req);
    if (isErrorResponse(auth)) return auth;

    try {
        const body: PlanAdaptationRequest = await req.json();
        const { sessionName, exercises, userGoals, recentWorkouts, currentPhaseType, weekNumber, totalPlanWeeks, userNotes } = body;
        if (!sessionName || !exercises || exercises.length === 0) {
            return NextResponse.json({ error: 'Session name and exercises are required' }, { status: 400 });
        }

        const exerciseDetails = exercises.slice(0, 12).map((ex) => {
            const actualSets = ex.actual_sets.slice(0, 8)
                .map((s, i) => `  Set ${i + 1}: ${s.weight} ${s.weight_unit} x ${s.reps}${s.rpe ? ` @ RPE ${s.rpe}` : ''}`)
                .join('\n');
            const painInfo = ex.pain_reported ? `\n  USER REPORTED PAIN: ${ex.pain_notes || 'Pain during this exercise'}` : '';
            return `${ex.exercise_name} (Target: ${ex.target_sets} sets x ${ex.target_reps} reps @ ${ex.target_weight}):\n${actualSets}${painInfo}`;
        }).join('\n\n');
        const recentContext = recentWorkouts?.length
            ? `\nRecent Workout History (last ${recentWorkouts.length} sessions):\n${recentWorkouts.slice(0, 8).map((w) => `- ${w.sessionName} on ${w.date}: ${Number(w.totalVolume || 0).toLocaleString('en-US')} volume${w.averageRpe ? `, avg RPE ${w.averageRpe}` : ''}`).join('\n')}`
            : '';
        const phaseContext = currentPhaseType
            ? `\nCurrent Training Phase: ${currentPhaseType}${weekNumber && totalPlanWeeks ? ` (Week ${weekNumber} of ${totalPlanWeeks})` : ''}`
            : '';
        const goalsContext = userGoals?.length ? `\nUser's Fitness Goals: ${userGoals.join(', ')}` : '';
        const notesContext = userNotes ? `\nUser Notes: ${String(userNotes).slice(0, 500)}` : '';

        const prompt = `You are SHaiPT AI Coach. Analyze this completed workout and generate plan adaptation recommendations for upcoming sessions.

Completed Workout: "${sessionName}"${goalsContext}${phaseContext}${recentContext}${notesContext}

Exercise Performance vs Targets:
${exerciseDetails}

Consider:
1. WEIGHT PROGRESSION: If RPE was consistently low (below 7-8), recommend weight increases. If RPE was consistently high (9-10), recommend maintaining or reducing weight.
2. EXERCISE SUBSTITUTION: If the user reported pain during an exercise, recommend a substitute that targets the same muscle group and avoids the movement pattern, and tell them to have the pain checked by a healthcare professional. Never diagnose.
3. VOLUME ADJUSTMENT: Based on recovery signals (RPE trends, completion rate), recommend adding or reducing sets/reps.
4. DELOAD RECOMMENDATION: If RPE has been consistently high across recent workouts or performance is declining, recommend a deload week.

summary: 1-2 sentences. recommendations: only where a change is warranted (substitute_exercise_name only for exercise_substitution, else null). overall_assessment: 2-3 sentences on trajectory and recovery. No emojis.`;

        const { tester } = await getProfileBits(auth);
        const res = await callModel({
            userId: auth.user.id, tester, feature: 'plan_adaptation', prompt, schema: AdaptationSchema,
            mock: () => JSON.stringify(NO_CHANGE),
        });
        const parsed = (res.json ?? NO_CHANGE) as PlanAdaptationResponse;
        return NextResponse.json(parsed);
    } catch (error: unknown) {
        const limited = limitResponse(error);
        if (limited) return limited;
        console.error('[ai-coach/plan-adaptation]', auth.user.id, error);
        const message = error instanceof Error ? error.message : 'Failed to generate plan adaptation';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
