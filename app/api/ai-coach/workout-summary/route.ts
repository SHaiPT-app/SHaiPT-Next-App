/**
 * POST /api/ai-coach/workout-summary → { feedback, recommendations[3] }
 * One gated call (flash-lite, 400 tokens, cached 24 h for identical sessions).
 */
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getUser, isErrorResponse, getProfileBits } from '@/lib/auth';
import { callModel, limitResponse } from '@/lib/ai/gateway';

interface WorkoutSummaryExercise {
    name: string;
    sets: Array<{ set_number: number; weight: number; reps: number; weight_unit: string; rpe?: number }>;
}

interface WorkoutSummaryRequest {
    sessionName: string;
    durationMinutes: number;
    totalVolume: number;
    totalSets: number;
    totalReps: number;
    weightUnit: string;
    exercises: WorkoutSummaryExercise[];
    prsAchieved: Array<{ exerciseName: string; weight: number; reps: number; unit: string }>;
    userGoals?: string[];
}

const SummarySchema = z.object({
    feedback: z.string(),
    recommendations: z.array(z.string()).min(1).max(5),
});

const MOCK_FEEDBACK = {
    feedback: 'Solid session. Your volume was well distributed across the exercises, and completing all prescribed sets shows good work capacity. Keep the tempo consistent for maximum time under tension.',
    recommendations: [
        'Add the smallest increment to your top sets next session if RPE was below 8',
        'Keep rest periods consistent to maintain training density',
        'Track your RPE more closely to guide progressive overload decisions',
    ],
};

export async function POST(req: Request) {
    const auth = await getUser(req);
    if (isErrorResponse(auth)) return auth;

    try {
        const body: WorkoutSummaryRequest = await req.json();
        const { sessionName, durationMinutes, totalVolume, totalSets, totalReps, weightUnit, exercises, prsAchieved, userGoals } = body;
        if (!sessionName || !exercises || exercises.length === 0) {
            return NextResponse.json({ error: 'Session name and exercises are required' }, { status: 400 });
        }

        const exerciseDetails = exercises.slice(0, 12).map((ex) => {
            const setLines = ex.sets.slice(0, 8)
                .map((s) => `  Set ${s.set_number}: ${s.weight} ${s.weight_unit} x ${s.reps}${s.rpe ? ` @ RPE ${s.rpe}` : ''}`)
                .join('\n');
            return `${ex.name}:\n${setLines}`;
        }).join('\n\n');
        const prDetails = prsAchieved?.length
            ? `\n\nPersonal Records achieved this session:\n${prsAchieved.map((pr) => `- ${pr.exerciseName}: ${pr.weight} ${pr.unit} x ${pr.reps}`).join('\n')}`
            : '';
        const goalsContext = userGoals?.length ? `\nUser's fitness goals: ${userGoals.join(', ')}` : '';

        const prompt = `You are SHaiPT AI Coach. Analyze this completed workout and provide brief, actionable feedback.

Workout: "${sessionName}"
Duration: ${durationMinutes} minutes
Total Volume: ${Number(totalVolume || 0).toLocaleString('en-US')} ${weightUnit}
Total Sets: ${totalSets}
Total Reps: ${totalReps}${goalsContext}

Exercise Details:
${exerciseDetails}${prDetails}

Respond with a JSON object containing exactly two fields:
1. "feedback": A 2-3 sentence analysis of the workout performance (no emojis, be direct and constructive)
2. "recommendations": An array of exactly 3 short, actionable recommendations for the next session
You are not a medical professional: if pain was reported, say to see a doctor instead of coaching around it.`;

        const { tester } = await getProfileBits(auth);
        const res = await callModel({
            userId: auth.user.id, tester, feature: 'workout_summary', prompt, schema: SummarySchema,
            mock: () => MOCK_FEEDBACK,
        });
        return NextResponse.json(res.json ?? MOCK_FEEDBACK);
    } catch (error: unknown) {
        const limited = limitResponse(error);
        if (limited) return limited;
        console.error('[ai-coach/workout-summary]', auth.user.id, error);
        const message = error instanceof Error ? error.message : 'Failed to generate workout summary';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
