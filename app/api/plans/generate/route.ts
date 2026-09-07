/**
 * POST /api/plans/generate { goals, experience_level, available_equipment, training_days_per_week,
 *   injuries_limitations, duration_weeks, phase_type, preferences, split_type? }
 * → { success: true, data: { plan } }   (exercises resolved against the library, with fourd_id)
 */
import { NextResponse } from 'next/server';
import { getUser, isErrorResponse, getProfileBits } from '@/lib/auth';
import { limitResponse } from '@/lib/ai/gateway';
import { generateTrainingPlan, profileFromFields } from '@/lib/ai/plans';

export async function POST(req: Request) {
    const auth = await getUser(req);
    if (isErrorResponse(auth)) return auth;

    try {
        const body = await req.json() as Record<string, unknown>;
        if (!body.goals || !body.experience_level || !body.training_days_per_week) {
            return NextResponse.json(
                { error: 'Missing required fields: goals, experience_level, training_days_per_week' },
                { status: 400 }
            );
        }
        const { tester } = await getProfileBits(auth);
        const profile = profileFromFields(body);
        const { plan, cached, mocked } = await generateTrainingPlan({ userId: auth.user.id, tester, profile });
        return NextResponse.json({ success: true, data: { plan }, cached, mocked });
    } catch (error: unknown) {
        const limited = limitResponse(error);
        if (limited) return limited;
        console.error('[plans/generate]', auth.user.id, error);
        const message = error instanceof Error ? error.message : 'Failed to generate plan';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
