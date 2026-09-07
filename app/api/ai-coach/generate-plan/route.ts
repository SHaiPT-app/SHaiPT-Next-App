/**
 * POST /api/ai-coach/generate-plan
 *   { action: 'recommend_splits', intakeData?, messages? } → { splits }
 *   { splitType, intakeData?, messages? }                  → { plan }
 *
 * Exercises come from the `exercises` table (the model chooses from candidates and returns ids;
 * the server joins names and the 4Dcoach id). Gated by lib/ai/gateway (caps, budget, cache).
 */
import { NextResponse } from 'next/server';
import { getUser, isErrorResponse, getProfileBits } from '@/lib/auth';
import { limitResponse } from '@/lib/ai/gateway';
import { generateTrainingPlan, recommendSplits, profileFromIntake, type GeneratedPlan, type ResolvedExercise } from '@/lib/ai/plans';
import type { IntakeFormData } from '@/lib/types';

export type { GeneratedPlan as GeneratedPlanData, ResolvedExercise as GeneratedExercise };
export type GeneratedSession = GeneratedPlan['sessions'][number];

export async function POST(req: Request) {
    const auth = await getUser(req);
    if (isErrorResponse(auth)) return auth;

    try {
        const body = await req.json() as {
            messages?: { role: string; content: string }[];
            intakeData?: IntakeFormData;
            splitType?: string;
            action?: string;
        };
        const { tester } = await getProfileBits(auth);
        const profile = profileFromIntake(body.intakeData, body.messages, body.splitType ? { splitType: body.splitType } : {});

        if (body.action === 'recommend_splits') {
            const { splits } = await recommendSplits({ userId: auth.user.id, tester, profile });
            return NextResponse.json({ splits });
        }

        if (!body.splitType) {
            return NextResponse.json({ error: 'splitType is required for plan generation' }, { status: 400 });
        }
        const { plan, cached, mocked } = await generateTrainingPlan({ userId: auth.user.id, tester, profile });
        return NextResponse.json({ plan, cached, mocked });
    } catch (error: unknown) {
        const limited = limitResponse(error);
        if (limited) return limited;
        console.error('[ai-coach/generate-plan]', auth.user.id, error);
        const message = error instanceof Error ? error.message : 'Failed to generate plan';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
