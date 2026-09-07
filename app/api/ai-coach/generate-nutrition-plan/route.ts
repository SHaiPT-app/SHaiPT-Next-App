/**
 * POST /api/ai-coach/generate-nutrition-plan { dietIntakeData, intakeData, messages? } → { plan }
 * Used by the dietitian interview flow. Same generator as /api/nutrition/generate; this one
 * returns the plan for the client to save (the coach page inserts it into nutrition_plans).
 */
import { NextResponse } from 'next/server';
import { getUser, isErrorResponse, getProfileBits } from '@/lib/auth';
import { limitResponse } from '@/lib/ai/gateway';
import { generateMealPlan, inputsFromIntake } from '@/lib/ai/nutrition';
import type { DietIntakeFormData, IntakeFormData, NutritionPlan, Profile } from '@/lib/types';

export type GeneratedNutritionPlanData = Omit<NutritionPlan, 'id' | 'user_id' | 'created_at' | 'updated_at'>;

export async function POST(req: Request) {
    const auth = await getUser(req);
    if (isErrorResponse(auth)) return auth;
    const { supabase, user } = auth;

    try {
        const { dietIntakeData, intakeData, messages } = await req.json() as {
            dietIntakeData?: DietIntakeFormData; intakeData?: IntakeFormData; messages?: Array<{ role: string; content: string }>;
        };
        if (!dietIntakeData || !intakeData) {
            return NextResponse.json({ error: 'Both diet intake data and training intake data are required' }, { status: 400 });
        }
        const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
        const { tester } = await getProfileBits(auth);
        const input = inputsFromIntake(intakeData, dietIntakeData, profile as Profile | null);
        input.notes = (messages ?? []).filter((m) => m.role === 'user').slice(-4).map((m) => m.content.slice(0, 200)).join(' | ');
        const { plan, cached, mocked } = await generateMealPlan({ userId: user.id, tester, input });
        return NextResponse.json({ plan, cached, mocked });
    } catch (error) {
        const limited = limitResponse(error);
        if (limited) return limited;
        console.error('[ai-coach/generate-nutrition-plan]', user.id, error);
        return NextResponse.json({ error: 'Failed to generate nutrition plan' }, { status: 500 });
    }
}
