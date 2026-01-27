import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { db } from '@/lib/supabaseDb';
import type { MacroTargets } from '@/lib/types';

const apiKey = process.env.GEMINI_API_KEY;
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { userId } = body;

        if (!userId) {
            return NextResponse.json(
                { error: 'userId is required' },
                { status: 400 }
            );
        }

        // Fetch user profile
        const profile = await db.profiles.getById(userId);
        if (!profile) {
            return NextResponse.json(
                { error: 'User profile not found' },
                { status: 404 }
            );
        }

        // Parse physical stats
        const weight = profile.weight_kg || 70;
        const height = profile.height_cm || 170;
        const age = profile.date_of_birth
            ? Math.floor((Date.now() - new Date(profile.date_of_birth).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
            : 25;
        const gender = profile.gender || 'male';

        // Calculate BMR (Mifflin-St Jeor)
        let bmr: number;
        if (gender.toLowerCase() === 'male') {
            bmr = (10 * weight) + (6.25 * height) - (5 * age) + 5;
        } else {
            bmr = (10 * weight) + (6.25 * height) - (5 * age) - 161;
        }

        const tdee = bmr * 1.55;
        const fitnessGoals = profile.fitness_goals || [];

        // Get active training plan for phase context
        let trainingPhase = 'general';
        try {
            const assignment = await db.trainingPlanAssignments.getActiveByUser(userId);
            if (assignment) {
                const plan = await db.trainingPlans.getById(assignment.plan_id);
                if (plan?.phase_type) {
                    trainingPhase = plan.phase_type;
                }
            }
        } catch {
            // No active plan, use general
        }

        // Fetch dietary preferences
        let dietaryPreferences: string[] = [];
        try {
            const { data: onboarding } = await (await import('@/lib/supabase')).supabase
                .from('onboarding')
                .select('dietary_preferences')
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
                .limit(1)
                .single();
            if (onboarding?.dietary_preferences) {
                dietaryPreferences = onboarding.dietary_preferences;
            }
        } catch {
            // No onboarding data
        }

        if (!genAI) {
            // Fallback: calculate macro targets without AI
            const targets = calculateFallbackTargets(tdee, fitnessGoals, trainingPhase, dietaryPreferences);
            return NextResponse.json({ targets });
        }

        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

        const prompt = `You are an expert sports nutritionist. Calculate optimal daily macro targets for this user.

USER PROFILE:
- Gender: ${gender}, Age: ${age}
- Weight: ${weight} kg, Height: ${height} cm
- Fitness Goals: ${fitnessGoals.join(', ') || 'general fitness'}
- Current Training Phase: ${trainingPhase}
- Dietary Preferences: ${dietaryPreferences.join(', ') || 'none'}
- Estimated TDEE: ${Math.round(tdee)} kcal

Return ONLY valid JSON (no markdown, no code fences) with this exact structure:
{
    "daily_calories": number,
    "protein_g": number,
    "carbs_g": number,
    "fat_g": number,
    "training_phase": "${trainingPhase}",
    "rationale": "Brief explanation of why these targets were chosen"
}`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        let text = response.text();

        if (text.includes('```json')) {
            text = text.split('```json')[1].split('```')[0];
        } else if (text.includes('```')) {
            text = text.split('```')[1].split('```')[0];
        }

        const targets: MacroTargets = JSON.parse(text.trim());
        return NextResponse.json({ targets });
    } catch (error) {
        console.error('Error generating macro targets:', error);
        return NextResponse.json(
            { error: 'Failed to generate macro targets' },
            { status: 500 }
        );
    }
}

function calculateFallbackTargets(
    tdee: number,
    fitnessGoals: string[],
    trainingPhase: string,
    dietaryPreferences: string[]
): MacroTargets {
    let dailyCalories = Math.round(tdee);
    let proteinRatio = 0.30;
    let carbsRatio = 0.40;
    let fatRatio = 0.30;

    // Adjust calories for goals
    if (fitnessGoals.includes('weight_loss') || fitnessGoals.includes('fat_loss')) {
        dailyCalories = Math.round(tdee * 0.8);
        proteinRatio = 0.35;
        carbsRatio = 0.35;
        fatRatio = 0.30;
    } else if (fitnessGoals.includes('muscle_gain') || fitnessGoals.includes('bulking')) {
        dailyCalories = Math.round(tdee * 1.15);
        proteinRatio = 0.30;
        carbsRatio = 0.45;
        fatRatio = 0.25;
    }

    // Adjust for training phase
    if (trainingPhase === 'strength' || trainingPhase === 'power') {
        proteinRatio = 0.35;
        carbsRatio = 0.40;
        fatRatio = 0.25;
    } else if (trainingPhase === 'hypertrophy') {
        proteinRatio = 0.30;
        carbsRatio = 0.45;
        fatRatio = 0.25;
    } else if (trainingPhase === 'endurance') {
        proteinRatio = 0.25;
        carbsRatio = 0.50;
        fatRatio = 0.25;
    } else if (trainingPhase === 'deload') {
        dailyCalories = Math.round(tdee * 0.9);
    }

    // Keto override
    if (dietaryPreferences.includes('keto')) {
        proteinRatio = 0.25;
        carbsRatio = 0.05;
        fatRatio = 0.70;
    }

    return {
        daily_calories: dailyCalories,
        protein_g: Math.round((dailyCalories * proteinRatio) / 4),
        carbs_g: Math.round((dailyCalories * carbsRatio) / 4),
        fat_g: Math.round((dailyCalories * fatRatio) / 9),
        training_phase: trainingPhase,
        rationale: `Targets based on ${trainingPhase} training phase with ${fitnessGoals.join(', ') || 'general fitness'} goals. Calories set at ${Math.round(dailyCalories)} kcal.`,
    };
}
