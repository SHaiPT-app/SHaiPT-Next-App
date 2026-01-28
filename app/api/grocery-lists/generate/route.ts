import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/supabaseDb';
import { extractGroceryItems } from '@/lib/groceryUtils';
import type { NutritionPlan } from '@/lib/types';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { userId, planId } = body;

        if (!userId) {
            return NextResponse.json(
                { error: 'userId is required' },
                { status: 400 }
            );
        }

        // Get the nutrition plan
        let plan: NutritionPlan | null = null;

        if (planId) {
            plan = await db.nutritionPlans.getById(planId);
        } else {
            plan = await db.nutritionPlans.getLatestByUser(userId);
        }

        if (!plan) {
            return NextResponse.json(
                { error: 'No nutrition plan found. Generate a meal plan first.' },
                { status: 404 }
            );
        }

        const items = extractGroceryItems(plan);

        if (items.length === 0) {
            return NextResponse.json(
                { error: 'No ingredients found in the meal plan' },
                { status: 400 }
            );
        }

        // Save grocery list to database
        const groceryList = await db.groceryLists.create({
            user_id: userId,
            nutrition_plan_id: plan.id,
            name: `Grocery List - ${plan.name || 'Meal Plan'}`,
            items,
            is_completed: false,
        });

        return NextResponse.json({ list: groceryList });
    } catch (error) {
        console.error('Error generating grocery list:', error);
        return NextResponse.json(
            { error: 'Failed to generate grocery list' },
            { status: 500 }
        );
    }
}
