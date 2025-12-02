
import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini API
const apiKey = process.env.GEMINI_API_KEY;
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

export async function POST(req: NextRequest) {
    console.log('Dietitian API called');
    console.log('API Key configured:', !!apiKey);

    if (!genAI) {
        console.error('Gemini API key is missing');
        return NextResponse.json(
            { error: 'Gemini API key not configured' },
            { status: 500 }
        );
    }

    try {
        const body = await req.json();
        const { profile, durationDays = 7 } = body;

        if (!profile) {
            return NextResponse.json(
                { error: 'Nutrition profile is required' },
                { status: 400 }
            );
        }

        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

        // Parse weight and height (handle string or number)
        const weight = parseFloat(String(profile.weight || profile.weight_kg || 0));
        const height = parseFloat(String(profile.height || profile.height_cm || 0));
        const age = parseInt(String(profile.age || 0));

        // Calculate BMR and TDEE (simplified logic ported from python)
        let bmr;
        if (String(profile.gender).toLowerCase() === 'male') {
            bmr = (10 * weight) + (6.25 * height) - (5 * age) + 5;
        } else {
            bmr = (10 * weight) + (6.25 * height) - (5 * age) - 161;
        }

        const activityMultipliers: Record<string, number> = {
            "sedentary": 1.2,
            "lightly_active": 1.375,
            "moderately_active": 1.55,
            "very_active": 1.725,
            "extremely_active": 1.9
        };

        const multiplier = activityMultipliers[profile.activity_level] || 1.55;
        const tdee = bmr * multiplier;

        let dailyCalories = Math.round(tdee);
        if (profile.fitness_goals.includes("weight_loss") || profile.fitness_goals.includes("fat_loss")) {
            dailyCalories = Math.round(tdee * 0.8);
        } else if (profile.fitness_goals.includes("muscle_gain") || profile.fitness_goals.includes("bulking")) {
            dailyCalories = Math.round(tdee * 1.15);
        } else if (profile.fitness_goals.includes("aggressive_cut")) {
            dailyCalories = Math.round(tdee * 0.7);
        }

        // Macro ratios
        let proteinRatio = 0.30;
        let carbsRatio = 0.40;
        let fatRatio = 0.30;

        if (profile.fitness_goals.includes("muscle_gain")) {
            proteinRatio = 0.30; carbsRatio = 0.45; fatRatio = 0.25;
        } else if (profile.fitness_goals.includes("weight_loss")) {
            proteinRatio = 0.35; carbsRatio = 0.35; fatRatio = 0.30;
        } else if (profile.dietary_preferences.includes("keto")) {
            proteinRatio = 0.25; carbsRatio = 0.05; fatRatio = 0.70;
        }

        const macros = {
            protein_g: Math.round((dailyCalories * proteinRatio) / 4),
            carbs_g: Math.round((dailyCalories * carbsRatio) / 4),
            fat_g: Math.round((dailyCalories * fatRatio) / 9)
        };

        const allergiesText = profile.allergies ? `\n- Allergies: ${profile.allergies.join(', ')}` : '';
        const dislikesText = profile.food_dislikes ? `\n- Food Dislikes: ${profile.food_dislikes.join(', ')}` : '';
        const medicalText = profile.medical_conditions ? `\n- Medical Conditions: ${profile.medical_conditions.join(', ')}` : '';

        const prompt = `
You are an expert registered dietitian and sports nutritionist. Create a detailed, personalized meal plan based on the following profile:

USER PROFILE:
- Name: ${profile.name}
- Age: ${age}, Gender: ${profile.gender}
- Weight: ${weight} kg, Height: ${height} cm
- Activity Level: ${profile.activity_level}
- Fitness Goals: ${profile.fitness_goals.join(', ')}
- Dietary Preferences: ${profile.dietary_preferences.join(', ')}
- Meals Per Day: ${profile.meals_per_day}
- Budget Level: ${profile.budget_level}
- Cooking Skill: ${profile.cooking_skill}
- Meal Prep Time: ${profile.meal_prep_time_minutes} minutes${allergiesText}${dislikesText}${medicalText}

CALCULATED NUTRITION TARGETS:
- Daily Calories: ${dailyCalories} kcal
- Protein: ${macros.protein_g}g
- Carbohydrates: ${macros.carbs_g}g
- Fats: ${macros.fat_g}g

REQUIREMENTS:
1. Create a ${durationDays}-day meal plan with variety and balance
2. Each day should include:
   - Breakfast, Lunch, Dinner (and snacks if meals_per_day > 3)
   - Complete recipes with ingredients and portions
   - Nutritional breakdown per meal (calories, protein, carbs, fats)
   - Meal timing suggestions
3. Provide a consolidated shopping list for the entire week
4. Include meal prep instructions for efficiency
5. Add hydration guidelines and supplement recommendations if applicable
6. Consider the user's cooking skill level and time constraints
7. Respect all dietary restrictions, allergies, and preferences
8. Ensure meals are practical and achievable

Please format the response as a structured JSON with the following schema:
{
    "plan_overview": {
        "duration_days": ${durationDays},
        "daily_calories": ${dailyCalories},
        "macros": {
            "protein_g": ${macros.protein_g},
            "carbs_g": ${macros.carbs_g},
            "fat_g": ${macros.fat_g}
        },
        "key_principles": []
    },
    "daily_schedule": {
        "day_1": {
            "breakfast": {
                "name": "string",
                "ingredients": [],
                "instructions": "string",
                "prep_time_minutes": 0,
                "nutrition": {
                    "calories": 0,
                    "protein_g": 0,
                    "carbs_g": 0,
                    "fat_g": 0
                }
            },
            "lunch": {},
            "dinner": {},
            "snacks": []
        }
    },
    "shopping_list": {
        "proteins": [],
        "vegetables": [],
        "fruits": [],
        "grains": [],
        "dairy": [],
        "other": []
    },
    "meal_prep_guide": {
        "sunday_prep": [],
        "daily_tasks": {}
    },
    "hydration": {
        "daily_water_liters": 0,
        "timing": "string"
    },
    "supplements": {
        "recommended": [],
        "optional": []
    },
    "nutrition_tips": []
}
`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        let text = response.text();

        if (text.includes('```json')) {
            text = text.split('```json')[1].split('```')[0];
        } else if (text.includes('```')) {
            text = text.split('```')[1].split('```')[0];
        }

        const mealData = JSON.parse(text.trim());

        return NextResponse.json({
            plan_id: `meal_plan_${new Date().toISOString().replace(/[-:T.]/g, '')}`,
            user_id: profile.name,
            created_at: new Date().toISOString(),
            duration_days: durationDays,
            daily_calories: dailyCalories,
            macros: macros,
            meal_schedule: mealData
        });

    } catch (error) {
        console.error('Error generating meal plan:', error);
        return NextResponse.json(
            { error: 'Failed to generate meal plan' },
            { status: 500 }
        );
    }
}
