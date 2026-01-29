import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextRequest, NextResponse } from 'next/server';
import type { DietIntakeFormData, IntakeFormData } from '@/lib/types';

export interface GeneratedNutritionPlanData {
    name: string;
    dietary_preferences: string[];
    plan_overview: {
        duration_days: number;
        daily_calories: number;
        macros: {
            calories: number;
            protein_g: number;
            carbs_g: number;
            fat_g: number;
        };
        key_principles: string[];
    };
    daily_schedule: Record<string, {
        breakfast: {
            name: string;
            ingredients: string[];
            instructions?: string;
            prep_time_minutes?: number;
            nutrition: {
                calories: number;
                protein_g: number;
                carbs_g: number;
                fat_g: number;
            };
        };
        lunch: {
            name: string;
            ingredients: string[];
            instructions?: string;
            prep_time_minutes?: number;
            nutrition: {
                calories: number;
                protein_g: number;
                carbs_g: number;
                fat_g: number;
            };
        };
        dinner: {
            name: string;
            ingredients: string[];
            instructions?: string;
            prep_time_minutes?: number;
            nutrition: {
                calories: number;
                protein_g: number;
                carbs_g: number;
                fat_g: number;
            };
        };
        snacks?: Array<{
            name: string;
            ingredients: string[];
            instructions?: string;
            prep_time_minutes?: number;
            nutrition: {
                calories: number;
                protein_g: number;
                carbs_g: number;
                fat_g: number;
            };
        }>;
    }>;
    shopping_list: Record<string, string[]>;
    nutrition_tips: string[];
}

function buildNutritionPlanPrompt(
    dietData: DietIntakeFormData,
    intakeData: IntakeFormData,
    messages: { role: string; content: string }[],
): string {
    const mealsPerDay = parseInt(dietData.meals_per_day) || 3;
    const includeSnacks = mealsPerDay > 3;

    const conversationContext = messages
        .map(m => `${m.role === 'user' ? 'CLIENT' : 'DIETITIAN'}: ${m.content}`)
        .join('\n');

    return `You are Dr. Nadia "The Fuel," an expert registered dietitian and sports nutritionist. Based on the following client profile and nutrition interview, create a comprehensive 7-day meal plan.

CLIENT PHYSICAL PROFILE:
- Name: ${intakeData.name || 'Client'}
- Age: ${intakeData.age || 'Not specified'}
- Height: ${intakeData.height || 'Not specified'}
- Weight: ${intakeData.weight || 'Not specified'}
- Fitness Goals: ${intakeData.fitness_goals || 'General fitness'}
- Training Days/Week: ${intakeData.training_days_per_week || 'Not specified'}
- Training Style: ${intakeData.training_style || 'Not specified'}

NUTRITION PROFILE:
- Allergies: ${dietData.allergies || 'None reported'}
- Intolerances: ${dietData.intolerances || 'None reported'}
- Diet Style: ${dietData.diet_style || 'Flexible'}
- Foods They Love: ${dietData.foods_love || 'Not specified'}
- Foods They Hate: ${dietData.foods_hate || 'Not specified'}
- Medical/Dietary Considerations: ${dietData.medical_dietary_considerations || 'None reported'}
- Meals Per Day: ${mealsPerDay}
- Cooking Preferences: ${dietData.cooking_preferences || 'Not specified'}

INTERVIEW CONVERSATION:
${conversationContext}

REQUIREMENTS:
1. Create a 7-day meal plan with variety and balance
2. Each day must include breakfast, lunch, dinner${includeSnacks ? `, and ${mealsPerDay - 3} snack(s)` : ''}
3. Include complete recipes with ingredients list and brief instructions
4. Provide nutritional breakdown per meal (calories, protein_g, carbs_g, fat_g)
5. Calculate appropriate daily calories based on their profile and goals
6. Include a consolidated shopping list organized by category
7. Add practical nutrition tips specific to their goals and dietary needs
8. Respect ALL allergies, intolerances, food preferences, and dietary restrictions
9. Incorporate foods they love where possible
10. Completely avoid foods they hate
11. Consider their cooking preferences and time constraints

Return ONLY valid JSON (no markdown fences) with this exact structure:
{
    "name": "Plan name reflecting their diet style",
    "dietary_preferences": ["array of diet styles"],
    "plan_overview": {
        "duration_days": 7,
        "daily_calories": 0,
        "macros": {
            "calories": 0,
            "protein_g": 0,
            "carbs_g": 0,
            "fat_g": 0
        },
        "key_principles": ["array of 3-5 key nutrition principles"]
    },
    "daily_schedule": {
        "day_1": {
            "breakfast": {
                "name": "Meal name",
                "ingredients": ["ingredient with amount"],
                "instructions": "Brief cooking instructions",
                "prep_time_minutes": 15,
                "nutrition": { "calories": 0, "protein_g": 0, "carbs_g": 0, "fat_g": 0 }
            },
            "lunch": { ... },
            "dinner": { ... }${includeSnacks ? ',\n            "snacks": [{ ... }]' : ''}
        }
    },
    "shopping_list": {
        "proteins": [],
        "vegetables": [],
        "fruits": [],
        "grains_and_starches": [],
        "dairy_and_alternatives": [],
        "fats_and_oils": [],
        "pantry_staples": []
    },
    "nutrition_tips": ["array of 5-7 practical tips"]
}`;
}

const MOCK_NUTRITION_PLAN: GeneratedNutritionPlanData = {
    name: 'Performance Fuel Plan',
    dietary_preferences: ['Flexible Dieting'],
    plan_overview: {
        duration_days: 7,
        daily_calories: 2400,
        macros: {
            calories: 2400,
            protein_g: 180,
            carbs_g: 260,
            fat_g: 75,
        },
        key_principles: [
            'Prioritize protein at every meal to support muscle recovery',
            'Time carbohydrates around training for optimal energy',
            'Include vegetables at lunch and dinner for micronutrients',
            'Stay hydrated with at least 3 liters of water daily',
        ],
    },
    daily_schedule: {
        day_1: {
            breakfast: {
                name: 'Protein Oat Bowl',
                ingredients: ['80g rolled oats', '1 scoop whey protein', '1 banana', '15g almond butter', '200ml milk'],
                instructions: 'Cook oats with milk, stir in protein powder, top with sliced banana and almond butter.',
                prep_time_minutes: 10,
                nutrition: { calories: 520, protein_g: 38, carbs_g: 65, fat_g: 14 },
            },
            lunch: {
                name: 'Grilled Chicken Rice Bowl',
                ingredients: ['200g chicken breast', '150g brown rice (cooked)', '100g broccoli', '50g bell peppers', '1 tbsp olive oil', 'Seasonings'],
                instructions: 'Grill seasoned chicken, serve over rice with roasted vegetables.',
                prep_time_minutes: 25,
                nutrition: { calories: 620, protein_g: 52, carbs_g: 60, fat_g: 16 },
            },
            dinner: {
                name: 'Salmon with Sweet Potato',
                ingredients: ['180g salmon fillet', '200g sweet potato', '100g asparagus', '1 tbsp olive oil', 'Lemon, garlic, herbs'],
                instructions: 'Bake salmon and sweet potato at 200C for 20 minutes. Steam asparagus.',
                prep_time_minutes: 30,
                nutrition: { calories: 580, protein_g: 42, carbs_g: 50, fat_g: 20 },
            },
            snacks: [
                {
                    name: 'Greek Yogurt with Berries',
                    ingredients: ['200g Greek yogurt', '80g mixed berries', '10g honey'],
                    instructions: 'Mix berries into yogurt, drizzle with honey.',
                    prep_time_minutes: 3,
                    nutrition: { calories: 220, protein_g: 20, carbs_g: 28, fat_g: 4 },
                },
                {
                    name: 'Trail Mix',
                    ingredients: ['30g almonds', '20g dark chocolate chips', '15g dried cranberries'],
                    instructions: 'Combine all ingredients.',
                    prep_time_minutes: 1,
                    nutrition: { calories: 280, protein_g: 8, carbs_g: 25, fat_g: 18 },
                },
            ],
        },
        day_2: {
            breakfast: {
                name: 'Egg and Avocado Toast',
                ingredients: ['3 eggs', '2 slices whole grain bread', '1/2 avocado', 'Cherry tomatoes', 'Salt and pepper'],
                instructions: 'Scramble eggs, toast bread, top with avocado and eggs.',
                prep_time_minutes: 10,
                nutrition: { calories: 490, protein_g: 28, carbs_g: 35, fat_g: 26 },
            },
            lunch: {
                name: 'Turkey and Quinoa Salad',
                ingredients: ['180g turkey breast', '100g quinoa (cooked)', 'Mixed greens', 'Cherry tomatoes', 'Cucumber', '2 tbsp balsamic vinaigrette'],
                instructions: 'Slice turkey over bed of quinoa and greens. Dress with vinaigrette.',
                prep_time_minutes: 15,
                nutrition: { calories: 550, protein_g: 48, carbs_g: 45, fat_g: 16 },
            },
            dinner: {
                name: 'Lean Beef Stir-Fry',
                ingredients: ['200g lean beef strips', '150g jasmine rice (cooked)', '100g mixed stir-fry vegetables', '2 tbsp soy sauce', '1 tbsp sesame oil'],
                instructions: 'Stir-fry beef and vegetables, season with soy sauce. Serve over rice.',
                prep_time_minutes: 20,
                nutrition: { calories: 640, protein_g: 50, carbs_g: 58, fat_g: 18 },
            },
            snacks: [
                {
                    name: 'Protein Shake',
                    ingredients: ['1 scoop whey protein', '250ml milk', '1 banana'],
                    instructions: 'Blend all ingredients until smooth.',
                    prep_time_minutes: 3,
                    nutrition: { calories: 320, protein_g: 35, carbs_g: 38, fat_g: 6 },
                },
            ],
        },
        day_3: {
            breakfast: { name: 'Protein Pancakes', ingredients: ['1 scoop whey protein', '2 eggs', '1 banana', '40g oats'], instructions: 'Blend ingredients, cook on non-stick pan.', prep_time_minutes: 15, nutrition: { calories: 450, protein_g: 38, carbs_g: 48, fat_g: 12 } },
            lunch: { name: 'Tuna Wrap', ingredients: ['150g canned tuna', '1 whole wheat wrap', 'Lettuce', 'Tomato', '1 tbsp light mayo'], instructions: 'Mix tuna with mayo, fill wrap with tuna and veggies.', prep_time_minutes: 10, nutrition: { calories: 480, protein_g: 42, carbs_g: 38, fat_g: 14 } },
            dinner: { name: 'Chicken Pasta', ingredients: ['200g chicken breast', '100g whole wheat pasta', '100g marinara sauce', 'Spinach', 'Parmesan'], instructions: 'Cook pasta, grill chicken, combine with sauce and spinach.', prep_time_minutes: 25, nutrition: { calories: 620, protein_g: 52, carbs_g: 60, fat_g: 14 } },
            snacks: [{ name: 'Cottage Cheese with Pineapple', ingredients: ['200g cottage cheese', '80g pineapple chunks'], instructions: 'Combine and enjoy.', prep_time_minutes: 2, nutrition: { calories: 200, protein_g: 24, carbs_g: 18, fat_g: 4 } }],
        },
        day_4: {
            breakfast: { name: 'Smoothie Bowl', ingredients: ['1 scoop protein', '1 banana', '100g frozen berries', '150ml almond milk', '20g granola'], instructions: 'Blend protein, banana, berries and milk. Top with granola.', prep_time_minutes: 8, nutrition: { calories: 420, protein_g: 32, carbs_g: 55, fat_g: 8 } },
            lunch: { name: 'Chicken Caesar Salad', ingredients: ['200g grilled chicken', 'Romaine lettuce', '30g parmesan', '2 tbsp Caesar dressing', 'Croutons'], instructions: 'Toss all ingredients together.', prep_time_minutes: 15, nutrition: { calories: 520, protein_g: 48, carbs_g: 20, fat_g: 28 } },
            dinner: { name: 'Shrimp and Vegetable Rice', ingredients: ['200g shrimp', '150g basmati rice (cooked)', '100g mixed vegetables', '1 tbsp olive oil', 'Garlic and lemon'], instructions: 'Sauté shrimp with garlic, serve over rice with vegetables.', prep_time_minutes: 20, nutrition: { calories: 560, protein_g: 44, carbs_g: 58, fat_g: 14 } },
            snacks: [{ name: 'Apple with Peanut Butter', ingredients: ['1 apple', '2 tbsp peanut butter'], instructions: 'Slice apple, dip in peanut butter.', prep_time_minutes: 2, nutrition: { calories: 280, protein_g: 8, carbs_g: 30, fat_g: 16 } }],
        },
        day_5: {
            breakfast: { name: 'Greek Yogurt Parfait', ingredients: ['200g Greek yogurt', '30g granola', '80g mixed berries', '10g honey'], instructions: 'Layer yogurt, granola, and berries.', prep_time_minutes: 5, nutrition: { calories: 380, protein_g: 28, carbs_g: 48, fat_g: 8 } },
            lunch: { name: 'Grilled Chicken Sandwich', ingredients: ['200g chicken breast', '2 slices sourdough', 'Lettuce', 'Tomato', '1 tbsp mustard'], instructions: 'Grill chicken, assemble sandwich with toppings.', prep_time_minutes: 15, nutrition: { calories: 520, protein_g: 48, carbs_g: 40, fat_g: 14 } },
            dinner: { name: 'Cod with Roasted Vegetables', ingredients: ['200g cod fillet', '200g mixed roast vegetables', '1 tbsp olive oil', 'Herbs'], instructions: 'Bake cod and vegetables at 200C for 20 minutes.', prep_time_minutes: 25, nutrition: { calories: 480, protein_g: 42, carbs_g: 30, fat_g: 16 } },
            snacks: [{ name: 'Protein Bar', ingredients: ['1 protein bar (store-bought)'], instructions: 'Unwrap and eat.', prep_time_minutes: 1, nutrition: { calories: 220, protein_g: 20, carbs_g: 24, fat_g: 8 } }],
        },
        day_6: {
            breakfast: { name: 'Omelette with Toast', ingredients: ['3 eggs', '50g mushrooms', '30g cheese', '1 slice whole grain toast'], instructions: 'Make omelette with mushrooms and cheese, serve with toast.', prep_time_minutes: 12, nutrition: { calories: 460, protein_g: 32, carbs_g: 20, fat_g: 28 } },
            lunch: { name: 'Poke Bowl', ingredients: ['150g salmon (raw or cooked)', '150g sushi rice', 'Edamame', 'Cucumber', 'Avocado', 'Soy sauce'], instructions: 'Arrange all ingredients over rice.', prep_time_minutes: 15, nutrition: { calories: 580, protein_g: 40, carbs_g: 55, fat_g: 20 } },
            dinner: { name: 'Turkey Meatballs with Pasta', ingredients: ['200g ground turkey', '100g whole wheat spaghetti', '100g marinara sauce', 'Herbs'], instructions: 'Form meatballs, bake, serve with pasta and sauce.', prep_time_minutes: 30, nutrition: { calories: 600, protein_g: 48, carbs_g: 60, fat_g: 14 } },
            snacks: [{ name: 'Hummus and Veggies', ingredients: ['60g hummus', 'Carrot sticks', 'Cucumber slices', 'Bell pepper strips'], instructions: 'Dip vegetables in hummus.', prep_time_minutes: 3, nutrition: { calories: 180, protein_g: 6, carbs_g: 18, fat_g: 10 } }],
        },
        day_7: {
            breakfast: { name: 'French Toast', ingredients: ['2 slices whole grain bread', '2 eggs', '50ml milk', 'Cinnamon', '80g berries', '10g maple syrup'], instructions: 'Dip bread in egg mixture, cook on pan, top with berries and syrup.', prep_time_minutes: 15, nutrition: { calories: 440, protein_g: 22, carbs_g: 52, fat_g: 16 } },
            lunch: { name: 'Chicken Burrito Bowl', ingredients: ['200g chicken breast', '100g brown rice', 'Black beans', 'Corn', 'Salsa', 'Lettuce'], instructions: 'Grill chicken, assemble bowl with all toppings.', prep_time_minutes: 20, nutrition: { calories: 580, protein_g: 50, carbs_g: 58, fat_g: 12 } },
            dinner: { name: 'Grilled Steak with Potatoes', ingredients: ['200g sirloin steak', '200g roasted potatoes', '100g green beans', '1 tbsp olive oil'], instructions: 'Grill steak to preference, roast potatoes, steam green beans.', prep_time_minutes: 30, nutrition: { calories: 640, protein_g: 50, carbs_g: 48, fat_g: 24 } },
            snacks: [{ name: 'Mixed Nuts', ingredients: ['40g mixed nuts (almonds, cashews, walnuts)'], instructions: 'Portion and enjoy.', prep_time_minutes: 1, nutrition: { calories: 240, protein_g: 8, carbs_g: 8, fat_g: 22 } }],
        },
    },
    shopping_list: {
        proteins: ['Chicken breast (400g)', 'Salmon fillets (360g)', 'Turkey breast (360g)', 'Lean beef (400g)', 'Eggs (1 dozen)', 'Whey protein powder', 'Greek yogurt (400g)'],
        vegetables: ['Broccoli (200g)', 'Bell peppers', 'Asparagus (200g)', 'Mixed greens', 'Cherry tomatoes', 'Cucumber', 'Mixed stir-fry vegetables'],
        fruits: ['Bananas (4)', 'Mixed berries (160g)', 'Avocado (1)', 'Dried cranberries'],
        grains_and_starches: ['Rolled oats (160g)', 'Brown rice', 'Sweet potatoes (400g)', 'Quinoa', 'Whole grain bread', 'Jasmine rice'],
        dairy_and_alternatives: ['Milk (1L)', 'Greek yogurt (400g)'],
        fats_and_oils: ['Olive oil', 'Almond butter', 'Sesame oil', 'Almonds', 'Dark chocolate chips'],
        pantry_staples: ['Soy sauce', 'Balsamic vinaigrette', 'Honey', 'Garlic', 'Lemon', 'Salt and pepper', 'Herbs and seasonings'],
    },
    nutrition_tips: [
        'Eat protein within 30 minutes of finishing your workout to maximize muscle repair.',
        'Hydrate with at least 500ml of water before your first meal of the day.',
        'On rest days, reduce carbohydrate portions by roughly 20% and increase vegetable servings.',
        'Prep your proteins and grains on Sunday to save time during the week.',
        'If you feel low energy before training, add a quick-digesting carb like a banana 30 minutes prior.',
    ],
};

export async function POST(req: NextRequest) {
    try {
        const { messages, dietIntakeData, intakeData } = await req.json();

        if (!dietIntakeData || !intakeData) {
            return NextResponse.json(
                { error: 'Both diet intake data and training intake data are required' },
                { status: 400 }
            );
        }

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            // Mock response
            return NextResponse.json({ plan: MOCK_NUTRITION_PLAN });
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

        const prompt = buildNutritionPlanPrompt(dietIntakeData, intakeData, messages || []);

        const result = await model.generateContent(prompt);
        const response = result.response;
        let text = response.text();

        // Clean markdown fences (consistent with other API routes)
        text = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();

        const plan = JSON.parse(text) as GeneratedNutritionPlanData;

        return NextResponse.json({ plan });
    } catch (error) {
        console.error('Nutrition plan generation error:', error);
        // Fallback to mock plan instead of returning an error (consistent with generate-plan API)
        return NextResponse.json({ plan: MOCK_NUTRITION_PLAN });
    }
}
