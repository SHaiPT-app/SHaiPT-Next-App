
import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini API
const apiKey = process.env.GEMINI_API_KEY;
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

export async function POST(req: NextRequest) {
    if (!genAI) {
        return NextResponse.json(
            { error: 'Gemini API key not configured' },
            { status: 500 }
        );
    }

    try {
        const body = await req.json();
        const { userProfile, durationWeeks = 4 } = body;

        if (!userProfile) {
            return NextResponse.json(
                { error: 'User profile is required' },
                { status: 400 }
            );
        }

        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

        const injuriesText = userProfile.injuries_or_limitations
            ? `\n- Injuries/Limitations: ${userProfile.injuries_or_limitations.join(', ')}`
            : '';

        const preferredTypes = userProfile.preferred_workout_types
            ? `\n- Preferred workout types: ${userProfile.preferred_workout_types.join(', ')}`
            : '';

        const prompt = `
You are an expert personal trainer and fitness consultant. Create a detailed, personalized workout plan based on the following profile:

USER PROFILE:
- Name: ${userProfile.name}
- Age: ${userProfile.age}
- Fitness Level: ${userProfile.fitness_level}
- Goals: ${userProfile.goals.join(', ')}
- Available Equipment: ${userProfile.available_equipment.join(', ')}
- Workout Days Per Week: ${userProfile.workout_days_per_week}
- Session Duration: ${userProfile.session_duration_minutes} minutes${injuriesText}${preferredTypes}

REQUIREMENTS:
1. Create a ${durationWeeks}-week progressive workout plan
2. Structure each workout day with:
   - Warm-up routine (5-10 minutes)
   - Main workout (exercises with sets, reps, and rest periods)
   - Cool-down and stretching (5-10 minutes)
3. Include exercise descriptions and proper form tips
4. Provide progression guidelines for each week
5. Add nutrition and recovery recommendations
6. Include metrics for tracking progress

Please format the response as a structured JSON with the following schema:
{
    "plan_overview": {
        "duration_weeks": ${durationWeeks},
        "focus_areas": [],
        "expected_outcomes": []
    },
    "weekly_schedule": {
        "week_1": {
            "day_1": {
                "focus": "string",
                "warm_up": [],
                "main_workout": [
                    {
                        "exercise": "string",
                        "sets": 0,
                        "reps": "string",
                        "rest_seconds": 0,
                        "notes": "string"
                    }
                ],
                "cool_down": []
            }
        }
    },
    "nutrition_guidelines": {
        "daily_protein_grams": 0,
        "daily_calories": 0,
        "meal_timing": "string",
        "hydration": "string"
    },
    "progress_tracking": {
        "weekly_measurements": [],
        "performance_metrics": []
    }
}
`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        let text = response.text();

        // Clean up markdown code blocks if present
        if (text.includes('```json')) {
            text = text.split('```json')[1].split('```')[0];
        } else if (text.includes('```')) {
            text = text.split('```')[1].split('```')[0];
        }

        const workoutData = JSON.parse(text.trim());

        return NextResponse.json({
            plan_id: `plan_${new Date().toISOString().replace(/[-:T.]/g, '')}`,
            user_id: userProfile.name,
            created_at: new Date().toISOString(),
            duration_weeks: durationWeeks,
            workout_schedule: workoutData
        });

    } catch (error) {
        console.error('Error generating workout plan:', error);
        return NextResponse.json(
            { error: 'Failed to generate workout plan' },
            { status: 500 }
        );
    }
}
