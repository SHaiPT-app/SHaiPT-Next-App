/**
 * POST /api/nutrition/generate → { plan }   (saved to nutrition_plans as the caller)
 * Targets are arithmetic; the meals come from one gated model call that picks foods from
 * food_database, with the macros computed by the server.
 */
import { NextResponse } from 'next/server';
import { getUser, isErrorResponse, getProfileBits } from '@/lib/auth';
import { limitResponse } from '@/lib/ai/gateway';
import { generateMealPlan, inputsFromProfile } from '@/lib/ai/nutrition';
import type { Profile } from '@/lib/types';

export async function POST(req: Request) {
    const auth = await getUser(req);
    if (isErrorResponse(auth)) return auth;
    const { supabase, user } = auth;

    try {
        const body = await req.json().catch(() => ({})) as { days?: number; notes?: string };
        const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
        if (!profile) return NextResponse.json({ error: 'User profile not found' }, { status: 404 });

        const { data: onboarding } = await supabase
            .from('onboarding').select('dietary_preferences, injuries_limitations').eq('user_id', user.id)
            .order('created_at', { ascending: false }).limit(1).maybeSingle();
        // the dietitian interview, when the user did one, knows allergies and dislikes
        const { data: interview } = await supabase
            .from('coach_interviews').select('intake_data').eq('user_id', user.id).eq('coach_id', 'dietitian')
            .maybeSingle();
        const diet = (interview?.intake_data ?? {}) as Record<string, string>;

        const { tester } = await getProfileBits(auth);
        const input = inputsFromProfile(profile as Profile, {
            dietaryPreferences: onboarding?.dietary_preferences ?? (diet.diet_style ? [diet.diet_style] : []),
            allergies: [diet.allergies, diet.intolerances].filter(Boolean).join('; '),
            dislikes: diet.foods_hate ?? '',
            likes: diet.foods_love ?? '',
            medical: diet.medical_dietary_considerations ?? '',
            mealsPerDay: parseInt(diet.meals_per_day ?? '', 10) || 4,
            cooking: diet.cooking_preferences ?? '',
            notes: body.notes ?? '',
        });
        const { plan, cached, mocked } = await generateMealPlan({ userId: user.id, tester, input, days: body.days });

        const { data: saved, error } = await supabase
            .from('nutrition_plans')
            .insert({ user_id: user.id, ...plan })
            .select()
            .single();
        if (error) throw new Error(error.message);
        return NextResponse.json({ plan: saved, cached, mocked });
    } catch (error) {
        const limited = limitResponse(error);
        if (limited) return limited;
        console.error('[nutrition/generate]', user.id, error);
        return NextResponse.json({ error: 'Failed to generate nutrition plan' }, { status: 500 });
    }
}
