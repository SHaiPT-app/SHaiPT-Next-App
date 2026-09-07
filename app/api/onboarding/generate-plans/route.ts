/**
 * POST /api/onboarding/generate-plans { messages } → { success, data: { extracted_profile, training_plan, nutrition_plan } }
 *
 * One API request, two gated model calls: a cheap extraction of the profile from the onboarding
 * chat, then the training plan from the exercise library. The nutrition part is arithmetic
 * (macro targets); the meal plan is generated later on the nutrition page. Saves the
 * `onboarding` row and marks the profile onboarded.
 */
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getUser, isErrorResponse, getProfileBits } from '@/lib/auth';
import { callModel, limitResponse, type ChatMessage } from '@/lib/ai/gateway';
import { generateTrainingPlan, profileFromFields } from '@/lib/ai/plans';
import { macroTargets, inputsFromProfile, parseWeightKg, parseHeightCm } from '@/lib/ai/nutrition';
import type { Profile } from '@/lib/types';

const ExtractedSchema = z.object({
    fitness_goals: z.array(z.string()).min(1).max(5),
    experience_level: z.enum(['beginner', 'intermediate', 'advanced']),
    available_equipment: z.array(z.string()).max(8),
    training_days_per_week: z.number().int().min(1).max(7),
    injuries_limitations: z.array(z.string()).max(6),
    dietary_preferences: z.array(z.string()).max(6),
    age: z.string().default(''),
    height: z.string().default(''),
    weight: z.string().default(''),
});
type Extracted = z.infer<typeof ExtractedSchema>;

const MOCK_EXTRACTED: Extracted = {
    fitness_goals: ['build muscle'], experience_level: 'beginner', available_equipment: ['full gym'],
    training_days_per_week: 3, injuries_limitations: [], dietary_preferences: [], age: '', height: '', weight: '',
};

export async function POST(req: Request) {
    const auth = await getUser(req);
    if (isErrorResponse(auth)) return auth;
    const { user, supabase } = auth;

    try {
        const { messages } = await req.json() as { messages?: ChatMessage[] };
        if (!messages || !Array.isArray(messages) || messages.length === 0) {
            return NextResponse.json({ error: 'Messages are required' }, { status: 400 });
        }
        const { tester } = await getProfileBits(auth);
        const conversation = messages.filter((m) => m && typeof m.content === 'string').slice(-24)
            .map((m) => `${m.role === 'user' ? 'User' : 'Coach'}: ${m.content.slice(0, 600)}`).join('\n');

        const extracted = await callModel<Extracted>({
            userId: user.id, tester, feature: 'interview', schema: ExtractedSchema, maxOutputTokens: 400, temperature: 0.1,
            prompt: `Extract the user's profile from this onboarding conversation. Use only what the user said; when something was not discussed choose a sensible default (experience beginner, 3 days, full gym, no restrictions). Keep age/height/weight as the user wrote them, or "".\n\nCONVERSATION:\n${conversation}`,
            mock: () => MOCK_EXTRACTED,
        });
        const profile = extracted.json ?? MOCK_EXTRACTED;

        const planProfile = profileFromFields({
            goals: profile.fitness_goals, experience_level: profile.experience_level,
            available_equipment: profile.available_equipment, training_days_per_week: profile.training_days_per_week,
            injuries_limitations: profile.injuries_limitations, duration_weeks: 4,
        });
        const { plan, cached, mocked } = await generateTrainingPlan({ userId: user.id, tester, profile: planProfile });

        const { data: row } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
        const targets = macroTargets(inputsFromProfile(row as Profile | null, {
            goals: profile.fitness_goals,
            dietaryPreferences: profile.dietary_preferences,
            weightKg: parseWeightKg(profile.weight) ?? Number(row?.weight_kg) ?? 70,
            heightCm: parseHeightCm(profile.height) ?? Number(row?.height_cm) ?? 170,
            age: parseInt(profile.age, 10) || undefined,
        }));

        await supabase.from('onboarding').insert({
            user_id: user.id,
            fitness_goals: profile.fitness_goals,
            experience_level: profile.experience_level,
            available_equipment: profile.available_equipment,
            training_frequency: profile.training_days_per_week,
            injuries_limitations: profile.injuries_limitations,
            dietary_preferences: profile.dietary_preferences,
            answers: { conversation: messages.slice(-24) },
            completed_at: new Date().toISOString(),
        });
        await supabase.from('profiles').update({ onboarding_completed: true, fitness_goals: profile.fitness_goals }).eq('id', user.id);

        return NextResponse.json({
            success: true,
            cached,
            mocked,
            data: {
                extracted_profile: profile,
                training_plan: {
                    name: plan.name,
                    description: plan.description,
                    duration_weeks: plan.duration_weeks,
                    periodization_blocks: plan.periodization_blocks,
                    sessions: plan.sessions.map((s) => ({ ...s, description: s.description ?? '', week_number: 1 })),
                },
                nutrition_plan: {
                    daily_calories: targets.daily_calories,
                    macros: { protein_g: targets.protein_g, carbs_g: targets.carbs_g, fat_g: targets.fat_g },
                    rationale: targets.rationale,
                    meal_plan: [],
                    shopping_list: [],
                    notes: 'Open Nutrition to generate a 7-day meal plan from these targets.',
                },
            },
        });
    } catch (error: unknown) {
        const limited = limitResponse(error);
        if (limited) return limited;
        console.error('[onboarding/generate-plans]', user.id, error);
        const message = error instanceof Error ? error.message : 'Failed to generate plans';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
