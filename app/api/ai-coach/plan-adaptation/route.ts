import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextRequest } from 'next/server';
import type { PlanAdaptationResponse, PlanAdaptationRecommendation } from '@/lib/types';

interface ExercisePerformance {
    exercise_name: string;
    exercise_id?: string;
    target_sets: number;
    target_reps: string;
    target_weight: string;
    actual_sets: Array<{
        weight: number;
        reps: number;
        rpe?: number;
        weight_unit: string;
    }>;
    pain_reported?: boolean;
    pain_notes?: string;
}

interface PlanAdaptationRequest {
    userId: string;
    workoutLogId: string;
    sessionName: string;
    exercises: ExercisePerformance[];
    recentWorkouts?: Array<{
        sessionName: string;
        date: string;
        totalVolume: number;
        averageRpe?: number;
    }>;
    userGoals?: string[];
    currentPhaseType?: string;
    weekNumber?: number;
    totalPlanWeeks?: number;
    userNotes?: string;
}

const MOCK_ADAPTATION: PlanAdaptationResponse = {
    summary: 'Based on your recent performance, your training is progressing well. A few adjustments are recommended to optimize your next sessions.',
    recommendations: [
        {
            type: 'weight_progression',
            exercise_name: 'Barbell Bench Press',
            current_value: '135 lbs',
            recommended_value: '140 lbs',
            rationale: 'All sets completed at RPE 7 or below, indicating room for progressive overload.',
        },
        {
            type: 'volume_adjustment',
            exercise_name: 'Lateral Raise',
            current_value: '3 sets x 12 reps',
            recommended_value: '4 sets x 12 reps',
            rationale: 'Volume tolerance is high based on recovery indicators. Adding one set to drive further hypertrophy.',
        },
    ],
    overall_assessment: 'Training adherence is strong. Progressive overload should continue on compound movements. Monitor recovery if volume increases are applied.',
};

export async function POST(req: NextRequest) {
    try {
        const body: PlanAdaptationRequest = await req.json();

        const { sessionName, exercises, userGoals, recentWorkouts, currentPhaseType, weekNumber, totalPlanWeeks, userNotes } = body;

        if (!sessionName || !exercises || exercises.length === 0) {
            return new Response(
                JSON.stringify({ error: 'Session name and exercises are required' }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            );
        }

        const exerciseDetails = exercises
            .map((ex) => {
                const actualSets = ex.actual_sets
                    .map(
                        (s, i) =>
                            `  Set ${i + 1}: ${s.weight} ${s.weight_unit} x ${s.reps}${s.rpe ? ` @ RPE ${s.rpe}` : ''}`
                    )
                    .join('\n');
                const painInfo = ex.pain_reported
                    ? `\n  USER REPORTED PAIN: ${ex.pain_notes || 'Pain during this exercise'}`
                    : '';
                return `${ex.exercise_name} (Target: ${ex.target_sets} sets x ${ex.target_reps} reps @ ${ex.target_weight}):\n${actualSets}${painInfo}`;
            })
            .join('\n\n');

        const recentContext = recentWorkouts?.length
            ? `\nRecent Workout History (last ${recentWorkouts.length} sessions):\n${recentWorkouts.map((w) => `- ${w.sessionName} on ${w.date}: ${w.totalVolume.toLocaleString('en-US')} volume${w.averageRpe ? `, avg RPE ${w.averageRpe}` : ''}`).join('\n')}`
            : '';

        const phaseContext = currentPhaseType
            ? `\nCurrent Training Phase: ${currentPhaseType}${weekNumber && totalPlanWeeks ? ` (Week ${weekNumber} of ${totalPlanWeeks})` : ''}`
            : '';

        const goalsContext = userGoals?.length
            ? `\nUser's Fitness Goals: ${userGoals.join(', ')}`
            : '';

        const notesContext = userNotes
            ? `\nUser Notes: ${userNotes}`
            : '';

        const prompt = `You are SHaiPT AI Coach. Analyze this completed workout and generate plan adaptation recommendations for upcoming sessions.

Completed Workout: "${sessionName}"${goalsContext}${phaseContext}${recentContext}${notesContext}

Exercise Performance vs Targets:
${exerciseDetails}

Analyze the performance data and generate adaptation recommendations. Consider:
1. WEIGHT PROGRESSION: If RPE was consistently low (below 7-8), recommend weight increases. If RPE was consistently high (9-10), recommend maintaining or reducing weight.
2. EXERCISE SUBSTITUTION: If the user reported pain during any exercise, recommend a substitute exercise that targets the same muscle group but avoids the problematic movement pattern.
3. VOLUME ADJUSTMENT: Based on recovery signals (RPE trends, workout completion rate), recommend adding or reducing sets/reps.
4. DELOAD RECOMMENDATION: If RPE has been consistently high across recent workouts or performance is declining, recommend a deload week.

Respond with a JSON object containing exactly these fields:
1. "summary": A 1-2 sentence summary of the adaptation analysis (no emojis)
2. "recommendations": An array of adaptation objects, each with:
   - "type": one of "weight_progression", "exercise_substitution", "volume_adjustment", "deload_recommendation"
   - "exercise_name": the exercise this applies to
   - "current_value": what the current prescription is
   - "recommended_value": what you recommend changing to
   - "rationale": brief explanation of why (1-2 sentences)
   - "substitute_exercise_name": (only for exercise_substitution type) the suggested replacement exercise
3. "overall_assessment": A 2-3 sentence overall assessment of training trajectory and recovery status (no emojis)

Only include recommendations where changes are warranted. If performance matches targets well, keep recommendations minimal.

JSON only, no markdown code fences.`;

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return new Response(JSON.stringify(MOCK_ADAPTATION), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

        const result = await model.generateContent(prompt);
        const text = result.response.text();

        let parsed: PlanAdaptationResponse;
        try {
            const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
            parsed = JSON.parse(cleaned);

            // Validate the structure
            if (!parsed.summary || !Array.isArray(parsed.recommendations) || !parsed.overall_assessment) {
                throw new Error('Invalid response structure');
            }

            // Validate recommendation types
            const validTypes: string[] = ['weight_progression', 'exercise_substitution', 'volume_adjustment', 'deload_recommendation'];
            parsed.recommendations = parsed.recommendations.filter(
                (rec: PlanAdaptationRecommendation) => validTypes.includes(rec.type) && rec.exercise_name && rec.rationale
            );
        } catch (parseError) {
            console.error('Plan adaptation JSON parse error:', parseError);
            // Return a generic response instead of mock data with hardcoded exercise names
            parsed = {
                summary: 'Your workout data has been recorded. We were unable to generate specific adaptation recommendations at this time.',
                recommendations: [],
                overall_assessment: 'Continue following your current program. Adaptation recommendations will be available after your next session.',
            };
        }

        return new Response(JSON.stringify(parsed), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });
    } catch (error: unknown) {
        console.error('Plan adaptation AI error:', error);

        const err = error as { status?: number; message?: string };
        if (err?.status === 429 || err?.message?.includes('429')) {
            return new Response(
                JSON.stringify({ error: 'Rate limited. Please try again shortly.' }),
                { status: 429, headers: { 'Content-Type': 'application/json' } }
            );
        }

        const message = error instanceof Error ? error.message : 'Failed to generate plan adaptation';
        return new Response(
            JSON.stringify({ error: message }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
}
