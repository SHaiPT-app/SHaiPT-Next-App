/** POST /api/grocery-lists/generate { planId? } → { list }  (no model call: ingredients are parsed from the plan) */
import { NextResponse } from 'next/server';
import { getUser, isErrorResponse } from '@/lib/auth';
import { extractGroceryItems } from '@/lib/groceryUtils';
import type { NutritionPlan } from '@/lib/types';

export async function POST(req: Request) {
    const auth = await getUser(req);
    if (isErrorResponse(auth)) return auth;
    const { user, supabase } = auth;

    try {
        const body = await req.json().catch(() => ({})) as { planId?: string };
        let query = supabase.from('nutrition_plans').select('*').eq('user_id', user.id);
        query = body.planId ? query.eq('id', body.planId) : query.order('created_at', { ascending: false }).limit(1);
        const { data: plans } = await query;
        const plan = (plans?.[0] ?? null) as NutritionPlan | null;
        if (!plan) return NextResponse.json({ error: 'No nutrition plan found. Generate a meal plan first.' }, { status: 404 });

        const items = extractGroceryItems(plan);
        if (items.length === 0) return NextResponse.json({ error: 'No ingredients found in the meal plan' }, { status: 400 });

        // Regenerating replaces the plan's list rather than stacking another copy next to it.
        await supabase.from('grocery_lists').delete().eq('user_id', user.id).eq('nutrition_plan_id', plan.id);

        const { data: list, error } = await supabase.from('grocery_lists')
            .insert({ user_id: user.id, nutrition_plan_id: plan.id, name: `Grocery List - ${plan.name || 'Meal Plan'}`, items, is_completed: false })
            .select().single();
        if (error) throw new Error(error.message);
        return NextResponse.json({ list });
    } catch (error) {
        console.error('[grocery-lists/generate]', user.id, error);
        return NextResponse.json({ error: 'Failed to generate grocery list' }, { status: 500 });
    }
}
