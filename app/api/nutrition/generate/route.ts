import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { db } from '@/lib/supabaseDb';
import type { DayMeals } from '@/lib/types';

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

        const durationDays = 7;

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

        const tdee = bmr * 1.55; // Default moderately active
        const fitnessGoals = profile.fitness_goals || [];

        let dailyCalories = Math.round(tdee);
        if (fitnessGoals.includes('weight_loss') || fitnessGoals.includes('fat_loss')) {
            dailyCalories = Math.round(tdee * 0.8);
        } else if (fitnessGoals.includes('muscle_gain') || fitnessGoals.includes('bulking')) {
            dailyCalories = Math.round(tdee * 1.15);
        }

        // Fetch onboarding data for dietary preferences
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
            // No onboarding data, proceed without
        }

        // Macro ratios
        let proteinRatio = 0.30;
        let carbsRatio = 0.40;
        let fatRatio = 0.30;

        if (fitnessGoals.includes('muscle_gain')) {
            proteinRatio = 0.30; carbsRatio = 0.45; fatRatio = 0.25;
        } else if (fitnessGoals.includes('weight_loss')) {
            proteinRatio = 0.35; carbsRatio = 0.35; fatRatio = 0.30;
        }
        if (dietaryPreferences.includes('keto')) {
            proteinRatio = 0.25; carbsRatio = 0.05; fatRatio = 0.70;
        }

        const macros = {
            protein_g: Math.round((dailyCalories * proteinRatio) / 4),
            carbs_g: Math.round((dailyCalories * carbsRatio) / 4),
            fat_g: Math.round((dailyCalories * fatRatio) / 9),
        };

        if (!genAI) {
            // Fallback mock plan when API key is missing
            const mockPlan = buildMockPlan(userId, durationDays, dailyCalories, macros, dietaryPreferences);
            return NextResponse.json({ plan: mockPlan });
        }

        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

        const dietaryText = dietaryPreferences.length > 0
            ? `Dietary Preferences: ${dietaryPreferences.join(', ')}`
            : 'No specific dietary restrictions';

        const prompt = `You are an expert sports nutritionist. Create a ${durationDays}-day meal plan.

USER PROFILE:
- Gender: ${gender}, Age: ${age}
- Weight: ${weight} kg, Height: ${height} cm
- Fitness Goals: ${fitnessGoals.join(', ') || 'general fitness'}
- ${dietaryText}

NUTRITION TARGETS:
- Daily Calories: ${dailyCalories} kcal
- Protein: ${macros.protein_g}g | Carbs: ${macros.carbs_g}g | Fats: ${macros.fat_g}g

Return ONLY valid JSON (no markdown, no code fences) with this exact structure:
{
    "plan_overview": {
        "duration_days": ${durationDays},
        "daily_calories": ${dailyCalories},
        "macros": { "calories": ${dailyCalories}, "protein_g": ${macros.protein_g}, "carbs_g": ${macros.carbs_g}, "fat_g": ${macros.fat_g} },
        "key_principles": ["string"]
    },
    "daily_schedule": {
        "day_1": {
            "breakfast": { "name": "string", "ingredients": ["string"], "instructions": "string", "prep_time_minutes": 0, "nutrition": { "calories": 0, "protein_g": 0, "carbs_g": 0, "fat_g": 0 } },
            "lunch": { "name": "string", "ingredients": ["string"], "instructions": "string", "prep_time_minutes": 0, "nutrition": { "calories": 0, "protein_g": 0, "carbs_g": 0, "fat_g": 0 } },
            "dinner": { "name": "string", "ingredients": ["string"], "instructions": "string", "prep_time_minutes": 0, "nutrition": { "calories": 0, "protein_g": 0, "carbs_g": 0, "fat_g": 0 } },
            "snacks": [{ "name": "string", "ingredients": ["string"], "nutrition": { "calories": 0, "protein_g": 0, "carbs_g": 0, "fat_g": 0 } }]
        }
    },
    "shopping_list": { "proteins": ["string"], "vegetables": ["string"], "fruits": ["string"], "grains": ["string"], "dairy": ["string"], "other": ["string"] },
    "nutrition_tips": ["string"]
}`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        let text = response.text();

        // Strip code fences if present
        if (text.includes('```json')) {
            text = text.split('```json')[1].split('```')[0];
        } else if (text.includes('```')) {
            text = text.split('```')[1].split('```')[0];
        }

        const mealData = JSON.parse(text.trim());

        // Save to database
        const savedPlan = await db.nutritionPlans.create({
            user_id: userId,
            name: `${durationDays}-Day Meal Plan`,
            dietary_preferences: dietaryPreferences,
            plan_overview: mealData.plan_overview || {
                duration_days: durationDays,
                daily_calories: dailyCalories,
                macros: { calories: dailyCalories, ...macros },
            },
            daily_schedule: mealData.daily_schedule || {},
            shopping_list: mealData.shopping_list || {},
            nutrition_tips: mealData.nutrition_tips || [],
        });

        return NextResponse.json({ plan: savedPlan });
    } catch (error) {
        console.error('Error generating nutrition plan:', error);
        return NextResponse.json(
            { error: 'Failed to generate nutrition plan' },
            { status: 500 }
        );
    }
}

function buildMockPlan(
    userId: string,
    durationDays: number,
    dailyCalories: number,
    macros: { protein_g: number; carbs_g: number; fat_g: number },
    dietaryPreferences: string[]
) {
    const mockSchedule: Record<string, DayMeals> = {};
    for (let d = 1; d <= durationDays; d++) {
        mockSchedule[`day_${d}`] = {
            breakfast: {
                name: 'Oatmeal with Berries and Nuts',
                ingredients: ['Rolled oats', 'Mixed berries', 'Almonds', 'Honey'],
                instructions: 'Cook oats, top with berries, almonds, and a drizzle of honey.',
                prep_time_minutes: 10,
                nutrition: { calories: Math.round(dailyCalories * 0.25), protein_g: Math.round(macros.protein_g * 0.2), carbs_g: Math.round(macros.carbs_g * 0.3), fat_g: Math.round(macros.fat_g * 0.2) },
            },
            lunch: {
                name: 'Grilled Chicken Salad',
                ingredients: ['Chicken breast', 'Mixed greens', 'Tomatoes', 'Olive oil', 'Lemon'],
                instructions: 'Grill chicken, toss with greens, tomatoes, and lemon-olive oil dressing.',
                prep_time_minutes: 20,
                nutrition: { calories: Math.round(dailyCalories * 0.35), protein_g: Math.round(macros.protein_g * 0.4), carbs_g: Math.round(macros.carbs_g * 0.25), fat_g: Math.round(macros.fat_g * 0.3) },
            },
            dinner: {
                name: 'Salmon with Sweet Potato and Vegetables',
                ingredients: ['Salmon fillet', 'Sweet potato', 'Broccoli', 'Olive oil'],
                instructions: 'Bake salmon and sweet potato at 200C for 25 minutes. Steam broccoli.',
                prep_time_minutes: 30,
                nutrition: { calories: Math.round(dailyCalories * 0.30), protein_g: Math.round(macros.protein_g * 0.3), carbs_g: Math.round(macros.carbs_g * 0.3), fat_g: Math.round(macros.fat_g * 0.35) },
            },
            snacks: [{
                name: 'Greek Yogurt with Seeds',
                ingredients: ['Greek yogurt', 'Chia seeds', 'Pumpkin seeds'],
                nutrition: { calories: Math.round(dailyCalories * 0.10), protein_g: Math.round(macros.protein_g * 0.1), carbs_g: Math.round(macros.carbs_g * 0.15), fat_g: Math.round(macros.fat_g * 0.15) },
            }],
        };
    }

    return {
        id: `mock_${Date.now()}`,
        user_id: userId,
        name: `${durationDays}-Day Meal Plan`,
        dietary_preferences: dietaryPreferences,
        plan_overview: {
            duration_days: durationDays,
            daily_calories: dailyCalories,
            macros: { calories: dailyCalories, protein_g: macros.protein_g, carbs_g: macros.carbs_g, fat_g: macros.fat_g },
            key_principles: [
                'Balanced macronutrient distribution',
                'Whole food focus',
                'Consistent meal timing',
            ],
        },
        daily_schedule: mockSchedule,
        shopping_list: {
            proteins: ['Chicken breast', 'Salmon', 'Greek yogurt'],
            vegetables: ['Mixed greens', 'Broccoli', 'Tomatoes'],
            fruits: ['Mixed berries'],
            grains: ['Rolled oats', 'Sweet potato'],
            dairy: ['Greek yogurt'],
            other: ['Olive oil', 'Honey', 'Almonds', 'Chia seeds', 'Pumpkin seeds', 'Lemon'],
        },
        nutrition_tips: [
            'Stay hydrated with at least 2-3 liters of water daily',
            'Eat protein with every meal to support muscle recovery',
            'Time your largest meal around your training window',
        ],
        created_at: new Date().toISOString(),
    };
}
