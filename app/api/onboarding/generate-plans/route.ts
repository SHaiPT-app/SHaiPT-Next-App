import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextRequest, NextResponse } from 'next/server';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
}

export async function POST(req: NextRequest) {
    try {
        const { messages, userId } = (await req.json()) as {
            messages: ChatMessage[];
            userId: string;
        };

        if (!messages || !userId) {
            return NextResponse.json(
                { error: 'Messages and userId are required' },
                { status: 400 }
            );
        }

        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

        // Build conversation context for extraction
        const conversationText = messages
            .map((m) => `${m.role === 'user' ? 'User' : 'Coach'}: ${m.content}`)
            .join('\n');

        const prompt = `You are an expert fitness consultant. Based on the following onboarding interview conversation, generate a personalized training plan and nutrition plan.

CONVERSATION:
${conversationText}

Extract the user's information from the conversation and generate BOTH plans. If any information wasn't explicitly discussed, make reasonable assumptions based on the goals and experience level mentioned.

Return a JSON object with this EXACT structure (no markdown, no code blocks, just raw JSON):
{
    "extracted_profile": {
        "fitness_goals": ["string"],
        "experience_level": "beginner|intermediate|advanced",
        "available_equipment": ["string"],
        "training_days_per_week": 3,
        "injuries_limitations": ["string"],
        "dietary_preferences": ["string"]
    },
    "training_plan": {
        "name": "string - descriptive plan name",
        "description": "string - brief description of the plan approach",
        "duration_weeks": 4,
        "sessions": [
            {
                "name": "string - e.g. Upper Body Push",
                "description": "string",
                "day_number": 1,
                "week_number": 1,
                "exercises": [
                    {
                        "exercise_name": "string",
                        "sets": [
                            {
                                "reps": "string - e.g. 10, 8-12, AMRAP",
                                "weight": "string - e.g. moderate, BW, 135lbs",
                                "rest_seconds": 90
                            }
                        ],
                        "notes": "string - form tips or notes"
                    }
                ]
            }
        ]
    },
    "nutrition_plan": {
        "daily_calories": 2000,
        "macros": {
            "protein_g": 150,
            "carbs_g": 200,
            "fat_g": 67
        },
        "meal_plan": [
            {
                "day_number": 1,
                "meals": [
                    {
                        "meal_type": "breakfast|lunch|dinner|snack",
                        "name": "string",
                        "ingredients": ["string"],
                        "calories": 500,
                        "protein_g": 30,
                        "carbs_g": 50,
                        "fat_g": 15,
                        "prep_time_minutes": 15
                    }
                ]
            }
        ],
        "shopping_list": ["string"],
        "notes": "string - general nutrition advice"
    }
}

REQUIREMENTS:
- Training plan should be periodized across 4 weeks with progressive overload
- Include at least one session per training day per week (so if 4 days/week, create sessions for days 1-4 for each of weeks 1-4)
- Each session should have 4-8 exercises with 2-4 sets each
- Nutrition plan should have 7 days of meals (3 meals + 1-2 snacks per day)
- Respect all injuries, limitations, and dietary preferences mentioned
- Use exercise names that are standard (e.g. "Barbell Back Squat", "Dumbbell Bench Press")
- Make weight recommendations relative (light, moderate, heavy, BW) since we don't know their maxes yet`;

        const result = await model.generateContent(prompt);
        const response = result.response.text();

        // Clean up markdown code blocks if present
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
        console.error('Plan generation error:', error);
        const message =
            error instanceof Error
                ? error.message
                : 'Failed to generate plans';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
