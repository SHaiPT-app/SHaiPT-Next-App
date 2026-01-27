import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextRequest } from 'next/server';

interface WorkoutSummaryExercise {
    name: string;
    sets: Array<{
        set_number: number;
        weight: number;
        reps: number;
        weight_unit: string;
        rpe?: number;
    }>;
}

interface WorkoutSummaryRequest {
    sessionName: string;
    durationMinutes: number;
    totalVolume: number;
    totalSets: number;
    totalReps: number;
    weightUnit: string;
    exercises: WorkoutSummaryExercise[];
    prsAchieved: Array<{
        exerciseName: string;
        weight: number;
        reps: number;
        unit: string;
    }>;
    userGoals?: string[];
}

const MOCK_FEEDBACK = [
    {
        feedback: "Solid session. Your volume was well-distributed across the exercises, and completing all prescribed sets shows good work capacity. Focus on maintaining consistent tempo on your reps for maximum time under tension.",
        recommendations: [
            "Consider adding 5 lbs to your top sets next session if RPE was below 8",
            "Keep rest periods consistent to maintain training density",
            "Track your RPE more closely to guide progressive overload decisions",
        ],
    },
    {
        feedback: "Good work getting through this workout. The set and rep ranges you hit are solid for building both strength and muscle. Make sure you're fueling properly post-workout with adequate protein within 2 hours.",
        recommendations: [
            "Aim for 0.8-1g of protein per pound of bodyweight daily",
            "If any sets felt too easy, increase weight by the smallest increment available",
            "Prioritize sleep tonight for optimal recovery from this session",
        ],
    },
];

function getMockFeedback() {
    return MOCK_FEEDBACK[Math.floor(Math.random() * MOCK_FEEDBACK.length)];
}

export async function POST(req: NextRequest) {
    try {
        const body: WorkoutSummaryRequest = await req.json();

        const {
            sessionName,
            durationMinutes,
            totalVolume,
            totalSets,
            totalReps,
            weightUnit,
            exercises,
            prsAchieved,
            userGoals,
        } = body;

        if (!sessionName || !exercises || exercises.length === 0) {
            return new Response(
                JSON.stringify({ error: 'Session name and exercises are required' }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            );
        }

        // Build the prompt
        const exerciseDetails = exercises
            .map((ex) => {
                const setLines = ex.sets
                    .map(
                        (s) =>
                            `  Set ${s.set_number}: ${s.weight} ${s.weight_unit} x ${s.reps}${s.rpe ? ` @ RPE ${s.rpe}` : ''}`
                    )
                    .join('\n');
                return `${ex.name}:\n${setLines}`;
            })
            .join('\n\n');

        const prDetails =
            prsAchieved.length > 0
                ? `\n\nPersonal Records achieved this session:\n${prsAchieved.map((pr) => `- ${pr.exerciseName}: ${pr.weight} ${pr.unit} x ${pr.reps}`).join('\n')}`
                : '';

        const goalsContext = userGoals?.length
            ? `\nUser's fitness goals: ${userGoals.join(', ')}`
            : '';

        const prompt = `You are SHaiPT AI Coach. Analyze this completed workout and provide brief, actionable feedback.

Workout: "${sessionName}"
Duration: ${durationMinutes} minutes
Total Volume: ${totalVolume.toLocaleString()} ${weightUnit}
Total Sets: ${totalSets}
Total Reps: ${totalReps}${goalsContext}

Exercise Details:
${exerciseDetails}${prDetails}

Respond with a JSON object containing exactly two fields:
1. "feedback": A 2-3 sentence analysis of the workout performance (no emojis, be direct and constructive)
2. "recommendations": An array of exactly 3 short, actionable recommendations for the next session

JSON only, no markdown code fences.`;

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            const mock = getMockFeedback();
            return new Response(JSON.stringify(mock), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

        const result = await model.generateContent(prompt);
        const text = result.response.text();

        // Parse the JSON response from Gemini
        let parsed: { feedback: string; recommendations: string[] };
        try {
            // Strip markdown code fences if present
            const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
            parsed = JSON.parse(cleaned);
        } catch {
            // If parsing fails, use the raw text as feedback
            parsed = {
                feedback: text.trim(),
                recommendations: [
                    'Continue with progressive overload on your main lifts',
                    'Ensure adequate recovery between sessions',
                    'Track your RPE to guide intensity decisions',
                ],
            };
        }

        return new Response(JSON.stringify(parsed), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });
    } catch (error: unknown) {
        console.error('Workout summary AI error:', error);

        // Handle rate limiting
        const err = error as { status?: number; message?: string };
        if (err?.status === 429 || err?.message?.includes('429')) {
            return new Response(
                JSON.stringify({ error: 'Rate limited. Please try again shortly.' }),
                { status: 429, headers: { 'Content-Type': 'application/json' } }
            );
        }

        const message = error instanceof Error ? error.message : 'Failed to generate workout summary';
        return new Response(
            JSON.stringify({ error: message }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
}
