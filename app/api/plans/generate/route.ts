import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
    try {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return NextResponse.json(
                { error: 'AI service is not configured. Please add your Gemini API key.' },
                { status: 503 }
            );
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        const body = await req.json();

        const {
            goals,
            experience_level,
            available_equipment,
            training_days_per_week,
            injuries_limitations,
            duration_weeks,
            phase_type,
            preferences,
        } = body;

        if (!goals || !experience_level || !training_days_per_week) {
            return NextResponse.json(
                { error: 'Missing required fields: goals, experience_level, training_days_per_week' },
                { status: 400 }
            );
        }

        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

        const prompt = `You are an expert strength & conditioning coach. Generate a periodized training plan based on the following user profile.

USER PROFILE:
- Goals: ${Array.isArray(goals) ? goals.join(', ') : goals}
- Experience Level: ${experience_level}
- Available Equipment: ${Array.isArray(available_equipment) ? available_equipment.join(', ') : available_equipment || 'Full gym'}
- Training Days Per Week: ${training_days_per_week}
- Injuries/Limitations: ${Array.isArray(injuries_limitations) ? injuries_limitations.join(', ') : injuries_limitations || 'None'}
- Plan Duration: ${duration_weeks || 8} weeks
- Preferred Phase Type: ${phase_type || 'auto (decide based on goals)'}
- Additional Preferences: ${preferences || 'None'}

Return a JSON object with this EXACT structure (no markdown, no code blocks, just raw JSON):
{
    "plan": {
        "name": "string - descriptive plan name",
        "description": "string - brief plan description",
        "duration_weeks": ${duration_weeks || 8},
        "periodization_blocks": [
            {
                "phase_type": "hypertrophy|strength|endurance|deload|power|general",
                "phase_duration_weeks": 4,
                "label": "string - e.g. Hypertrophy Phase"
            }
        ],
        "sessions": [
            {
                "name": "string - e.g. Upper Body Push",
                "day_number": 1,
                "exercises": [
                    {
                        "exercise_name": "string - standard exercise name",
                        "sets": [
                            {
                                "reps": "string - e.g. 10, 8-12, AMRAP",
                                "weight": "string - e.g. moderate, BW, RPE 7",
                                "rest_seconds": 90
                            }
                        ],
                        "notes": "string - form cues or special instructions"
                    }
                ]
            }
        ]
    }
}

REQUIREMENTS:
- Create ${training_days_per_week} sessions per week cycle (day_number 1 through ${training_days_per_week})
- Each session should have 4-8 exercises with 2-5 sets each
- Include appropriate periodization blocks that total to ${duration_weeks || 8} weeks
- Always end with a deload week if the plan is 6+ weeks
- Use standard exercise names (e.g. "Barbell Back Squat", "Dumbbell Bench Press", "Pull-Up")
- Include rest_seconds for each set (60-180 seconds typical)
- Add helpful notes/cues for each exercise
- Respect all injuries and limitations
- Weight recommendations should be relative (light, moderate, heavy, BW, RPE scale) since we don't know their maxes`;

        const result = await model.generateContent(prompt);
        const response = result.response.text();

        let cleanText = response;
        if (cleanText.includes('```json')) {
            cleanText = cleanText.split('```json')[1].split('```')[0];
        } else if (cleanText.includes('```')) {
            cleanText = cleanText.split('```')[1].split('```')[0];
        }

        const planData = JSON.parse(cleanText.trim());

        return NextResponse.json({
            success: true,
            data: planData,
        });
    } catch (error: unknown) {
        console.error('AI plan generation error:', error);
        const message =
            error instanceof Error ? error.message : 'Failed to generate plan';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
