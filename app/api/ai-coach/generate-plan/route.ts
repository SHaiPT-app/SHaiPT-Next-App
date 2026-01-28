import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextRequest, NextResponse } from 'next/server';
import type { IntakeFormData } from '@/lib/types';

export interface GeneratedExercise {
    exercise_name: string;
    sets: {
        reps: string;
        weight: string;
        rest_seconds: number;
    }[];
    notes: string;
}

export interface GeneratedSession {
    name: string;
    day_number: number;
    exercises: GeneratedExercise[];
}

export interface GeneratedPlanData {
    name: string;
    description: string;
    duration_weeks: number;
    split_type: string;
    periodization_blocks: {
        phase_type: string;
        phase_duration_weeks: number;
        label: string;
    }[];
    sessions: GeneratedSession[];
}

const SPLIT_TYPES: Record<string, string> = {
    ppl: 'Push/Pull/Legs (PPL)',
    upper_lower: 'Upper/Lower Split',
    full_body: 'Full Body',
    bro_split: 'Bro Split (body part per day)',
    phul: 'PHUL (Power Hypertrophy Upper Lower)',
    phat: 'PHAT (Power Hypertrophy Adaptive Training)',
};

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const {
            messages,
            intakeData,
            splitType,
            action,
        } = body as {
            messages?: { role: string; content: string }[];
            intakeData?: IntakeFormData;
            splitType?: string;
            action?: string;
        };

        // Action: recommend splits based on interview data
        if (action === 'recommend_splits') {
            return await handleRecommendSplits(messages, intakeData);
        }

        // Action: generate full plan
        if (!splitType) {
            return NextResponse.json(
                { error: 'splitType is required for plan generation' },
                { status: 400 }
            );
        }

        return await handleGeneratePlan(messages, intakeData, splitType);
    } catch (error: unknown) {
        console.error('Plan generation error:', error);
        const message = error instanceof Error ? error.message : 'Failed to generate plan';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

async function handleRecommendSplits(
    messages?: { role: string; content: string }[],
    intakeData?: IntakeFormData
): Promise<Response> {
    const apiKey = process.env.GEMINI_API_KEY;

    // Build context from intake data and messages
    const context = buildUserContext(messages, intakeData);

    if (!apiKey) {
        // Mock fallback
        const trainingDays = parseInt(intakeData?.training_days_per_week || '4');
        return NextResponse.json({
            splits: getMockSplitRecommendations(trainingDays),
        });
    }

    try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

        const prompt = `You are an expert strength and conditioning coach. Based on the following client profile, recommend training split options ranked from most to least suitable.

CLIENT PROFILE:
${context}

Return ONLY a valid JSON array (no markdown, no code blocks) with 3-4 split options, ordered from most recommended to least. Each option should have:
[
    {
        "id": "ppl|upper_lower|full_body|bro_split|phul|phat",
        "name": "string - split name",
        "description": "string - 1-2 sentence explanation of why this suits the client",
        "days_per_week": number,
        "recommended": boolean (true for the top pick only)
    }
]

RULES:
- The first option should be your top recommendation with recommended: true
- Match days_per_week to what the client said they can train
- Consider their experience level, goals, schedule, and equipment
- A beginner should not get bro_split or PHAT
- Someone training 3 days should get full body or upper/lower, not PPL (which needs 6 days to run twice)
- Keep descriptions concise and specific to this client's profile`;

        const result = await model.generateContent(prompt);
        const responseText = result.response.text().trim();
        const cleaned = responseText.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
        const splits = JSON.parse(cleaned);

        return NextResponse.json({ splits });
    } catch (error) {
        console.error('Split recommendation error:', error);
        const trainingDays = parseInt(intakeData?.training_days_per_week || '4');
        return NextResponse.json({
            splits: getMockSplitRecommendations(trainingDays),
        });
    }
}

async function handleGeneratePlan(
    messages?: { role: string; content: string }[],
    intakeData?: IntakeFormData,
    splitType?: string
): Promise<Response> {
    const apiKey = process.env.GEMINI_API_KEY;
    const context = buildUserContext(messages, intakeData);
    const splitName = SPLIT_TYPES[splitType || 'full_body'] || splitType;
    const trainingDays = parseInt(intakeData?.training_days_per_week || '4');

    if (!apiKey) {
        return NextResponse.json({
            plan: getMockPlan(splitType || 'full_body', trainingDays),
        });
    }

    try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

        const prompt = `You are an expert strength and conditioning coach. Generate a complete periodized training plan based on the client profile and chosen split type.

CLIENT PROFILE:
${context}

CHOSEN SPLIT: ${splitName}
TRAINING DAYS PER WEEK: ${trainingDays}

Return ONLY a valid JSON object (no markdown, no code blocks) with this exact structure:
{
    "name": "string - descriptive plan name",
    "description": "string - 2-3 sentence plan overview",
    "duration_weeks": 8,
    "split_type": "${splitType}",
    "periodization_blocks": [
        {
            "phase_type": "hypertrophy|strength|endurance|deload|power|general",
            "phase_duration_weeks": 4,
            "label": "string - e.g. Hypertrophy Phase"
        }
    ],
    "sessions": [
        {
            "name": "string - e.g. Push Day, Upper Body A, Full Body 1",
            "day_number": 1,
            "exercises": [
                {
                    "exercise_name": "string - standard exercise name",
                    "sets": [
                        {
                            "reps": "string - e.g. 10, 8-12, AMRAP",
                            "weight": "string - e.g. moderate, heavy, BW, RPE 7",
                            "rest_seconds": 90
                        }
                    ],
                    "notes": "string - form cues, tempo, intensifiers"
                }
            ]
        }
    ]
}

REQUIREMENTS:
- Create exactly ${trainingDays} sessions (day_number 1 through ${trainingDays})
- Each session should have 5-8 exercises with 3-4 sets each
- Include appropriate periodization blocks totaling 8 weeks
- End with a deload week if the plan is 6+ weeks
- Use standard exercise names (e.g. "Barbell Back Squat", "Dumbbell Bench Press", "Pull-Up")
- Include rest_seconds for each set (60-180 seconds typical)
- Add helpful form cues and notes for each exercise
- Respect ALL injuries and limitations mentioned
- Weight recommendations should be relative (light, moderate, heavy, BW, RPE scale) since we don't know their maxes
- Include intensifiers where appropriate (drop sets, supersets, rest-pause) in notes
- The plan name should reflect the split type and client goals`;

        const result = await model.generateContent(prompt);
        const responseText = result.response.text().trim();
        const cleaned = responseText.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
        const plan = JSON.parse(cleaned);

        return NextResponse.json({ plan });
    } catch (error) {
        console.error('Plan generation error:', error);
        return NextResponse.json({
            plan: getMockPlan(splitType || 'full_body', trainingDays),
        });
    }
}

function buildUserContext(
    messages?: { role: string; content: string }[],
    intakeData?: IntakeFormData
): string {
    const parts: string[] = [];

    if (intakeData) {
        if (intakeData.name) parts.push(`Name: ${intakeData.name}`);
        if (intakeData.age) parts.push(`Age: ${intakeData.age}`);
        if (intakeData.height) parts.push(`Height: ${intakeData.height}`);
        if (intakeData.weight) parts.push(`Weight: ${intakeData.weight}`);
        if (intakeData.sport_history) parts.push(`Athletic history: ${intakeData.sport_history}`);
        if (intakeData.training_duration) parts.push(`Training experience: ${intakeData.training_duration}`);
        if (intakeData.training_style) parts.push(`Training style: ${intakeData.training_style}`);
        if (intakeData.fitness_goals) parts.push(`Goals: ${intakeData.fitness_goals}`);
        if (intakeData.fitness_level) parts.push(`Fitness level: ${intakeData.fitness_level}`);
        if (intakeData.training_days_per_week) parts.push(`Training days per week: ${intakeData.training_days_per_week}`);
        if (intakeData.session_duration) parts.push(`Session duration: ${intakeData.session_duration}`);
        if (intakeData.preferred_time) parts.push(`Preferred time: ${intakeData.preferred_time}`);
        if (intakeData.available_equipment) parts.push(`Equipment: ${intakeData.available_equipment}`);
        if (intakeData.training_location) parts.push(`Location: ${intakeData.training_location}`);
        if (intakeData.injuries) parts.push(`Injuries: ${intakeData.injuries}`);
        if (intakeData.medical_considerations) parts.push(`Medical: ${intakeData.medical_considerations}`);
    }

    if (messages && messages.length > 0) {
        parts.push('\nInterview conversation summary:');
        // Include last few user messages for context
        const userMessages = messages.filter(m => m.role === 'user').slice(-5);
        for (const msg of userMessages) {
            parts.push(`- Client: ${msg.content}`);
        }
    }

    return parts.join('\n') || 'No profile data available';
}

function getMockSplitRecommendations(trainingDays: number) {
    if (trainingDays <= 3) {
        return [
            { id: 'full_body', name: 'Full Body', description: 'Best for your schedule -- hit every muscle group each session for maximum frequency.', days_per_week: trainingDays, recommended: true },
            { id: 'upper_lower', name: 'Upper/Lower Split', description: 'Alternate upper and lower body days for balanced development.', days_per_week: trainingDays, recommended: false },
            { id: 'ppl', name: 'Push/Pull/Legs', description: 'Classic split targeting push, pull, and leg muscles separately.', days_per_week: trainingDays, recommended: false },
        ];
    }

    if (trainingDays <= 4) {
        return [
            { id: 'upper_lower', name: 'Upper/Lower Split', description: 'Ideal for 4-day training -- two upper and two lower sessions per week.', days_per_week: trainingDays, recommended: true },
            { id: 'ppl', name: 'Push/Pull/Legs', description: 'Classic bodybuilding split with focused muscle group days.', days_per_week: trainingDays, recommended: false },
            { id: 'full_body', name: 'Full Body', description: 'High frequency approach hitting each muscle more often.', days_per_week: trainingDays, recommended: false },
        ];
    }

    return [
        { id: 'ppl', name: 'Push/Pull/Legs', description: 'Perfect for 5-6 day training -- run the cycle twice per week for optimal volume.', days_per_week: trainingDays, recommended: true },
        { id: 'upper_lower', name: 'Upper/Lower Split', description: 'Proven 4-5 day split with clear upper/lower division.', days_per_week: trainingDays, recommended: false },
        { id: 'bro_split', name: 'Bro Split', description: 'One body part per day for maximum volume per muscle group.', days_per_week: trainingDays, recommended: false },
    ];
}

function getMockPlan(splitType: string, trainingDays: number): GeneratedPlanData {
    const sessionNames: Record<string, string[]> = {
        ppl: ['Push Day', 'Pull Day', 'Legs Day'],
        upper_lower: ['Upper Body A', 'Lower Body A', 'Upper Body B', 'Lower Body B'],
        full_body: ['Full Body A', 'Full Body B', 'Full Body C'],
        bro_split: ['Chest', 'Back', 'Shoulders', 'Arms', 'Legs'],
    };

    const names = sessionNames[splitType] || sessionNames.full_body;

    const mockExercises: GeneratedExercise[] = [
        {
            exercise_name: 'Barbell Back Squat',
            sets: [
                { reps: '8-10', weight: 'moderate', rest_seconds: 120 },
                { reps: '8-10', weight: 'moderate', rest_seconds: 120 },
                { reps: '8-10', weight: 'moderate', rest_seconds: 120 },
            ],
            notes: 'Keep chest up, drive through heels. Full depth below parallel.',
        },
        {
            exercise_name: 'Dumbbell Bench Press',
            sets: [
                { reps: '10-12', weight: 'moderate', rest_seconds: 90 },
                { reps: '10-12', weight: 'moderate', rest_seconds: 90 },
                { reps: '10-12', weight: 'moderate', rest_seconds: 90 },
            ],
            notes: 'Control the descent, press through the chest. Slight arch in back.',
        },
        {
            exercise_name: 'Barbell Bent-Over Row',
            sets: [
                { reps: '8-12', weight: 'moderate', rest_seconds: 90 },
                { reps: '8-12', weight: 'moderate', rest_seconds: 90 },
                { reps: '8-12', weight: 'moderate', rest_seconds: 90 },
            ],
            notes: 'Hinge at hips, pull to lower chest. Squeeze shoulder blades.',
        },
        {
            exercise_name: 'Overhead Press',
            sets: [
                { reps: '8-10', weight: 'moderate', rest_seconds: 90 },
                { reps: '8-10', weight: 'moderate', rest_seconds: 90 },
                { reps: '8-10', weight: 'moderate', rest_seconds: 90 },
            ],
            notes: 'Brace core, press overhead in a slight arc. Lock out at top.',
        },
        {
            exercise_name: 'Romanian Deadlift',
            sets: [
                { reps: '10-12', weight: 'moderate', rest_seconds: 90 },
                { reps: '10-12', weight: 'moderate', rest_seconds: 90 },
                { reps: '10-12', weight: 'moderate', rest_seconds: 90 },
            ],
            notes: 'Maintain flat back, hinge at hips. Feel stretch in hamstrings.',
        },
    ];

    const sessions: GeneratedSession[] = [];
    for (let d = 0; d < trainingDays; d++) {
        sessions.push({
            name: names[d % names.length],
            day_number: d + 1,
            exercises: mockExercises.slice(0, 5),
        });
    }

    return {
        name: `${SPLIT_TYPES[splitType] || 'Custom'} Training Program`,
        description: 'A personalized training program designed based on your goals, experience, and available equipment. This plan uses progressive overload across 8 weeks to build strength and muscle.',
        duration_weeks: 8,
        split_type: splitType,
        periodization_blocks: [
            { phase_type: 'hypertrophy', phase_duration_weeks: 4, label: 'Hypertrophy Phase' },
            { phase_type: 'strength', phase_duration_weeks: 3, label: 'Strength Phase' },
            { phase_type: 'deload', phase_duration_weeks: 1, label: 'Deload Week' },
        ],
        sessions,
    };
}
