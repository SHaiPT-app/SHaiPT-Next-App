/**
 * POST /api/nutrition/macro-targets → { targets }
 * Arithmetic only (Mifflin-St Jeor + goal/phase adjustments), no model call. The caller is the
 * token holder; the profile, the active plan's phase and the onboarding diet preferences are read
 * under their own RLS.
 */
import { NextResponse } from 'next/server';
import { getUser, isErrorResponse } from '@/lib/auth';
import { macroTargets, inputsFromProfile } from '@/lib/ai/nutrition';
import type { Profile } from '@/lib/types';

export async function POST(req: Request) {
    const auth = await getUser(req);
    if (isErrorResponse(auth)) return auth;
    const { supabase, user } = auth;

    try {
        const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
        if (!profile) return NextResponse.json({ error: 'User profile not found' }, { status: 404 });

        let trainingPhase = 'general';
        const today = new Date().toISOString().slice(0, 10);
        const { data: assignment } = await supabase
            .from('training_plan_assignments')
            .select('plan_id, training_plans(phase_type)')
            .eq('user_id', user.id).eq('is_active', true).lte('start_date', today).gte('end_date', today)
            .order('start_date', { ascending: false }).limit(1).maybeSingle();
        const plan = assignment?.training_plans as { phase_type?: string } | { phase_type?: string }[] | null | undefined;
        const phase = Array.isArray(plan) ? plan[0]?.phase_type : plan?.phase_type;
        if (phase) trainingPhase = phase;

        const { data: onboarding } = await supabase
            .from('onboarding').select('dietary_preferences').eq('user_id', user.id)
            .order('created_at', { ascending: false }).limit(1).maybeSingle();

        const targets = macroTargets(inputsFromProfile(profile as Profile, {
            trainingPhase,
            dietaryPreferences: onboarding?.dietary_preferences ?? [],
        }));
        return NextResponse.json({ targets });
    } catch (error) {
        console.error('[nutrition/macro-targets]', user.id, error);
        return NextResponse.json({ error: 'Failed to generate macro targets' }, { status: 500 });
    }
}
