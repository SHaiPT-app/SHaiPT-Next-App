import { NextResponse } from 'next/server';
import { forbidden, getAdmin, isActiveCoachOf, isErrorResponse, requireTrainer } from '@/lib/auth';

/**
 * A trainer switches a trainee's AI features. The trainee must be linked to the caller
 * (profiles.trainer_id) or have an active coaching relationship with them; the write then
 * uses the service role because a profile is only writable by its owner under RLS.
 */
export async function POST(request: Request) {
    try {
        const auth = await requireTrainer(request);
        if (isErrorResponse(auth)) return auth;

        const { traineeId, features } = await request.json();

        if (!traineeId || !features) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const { data: trainee, error: traineeError } = await auth.supabase
            .from('profiles')
            .select('id, trainer_id')
            .eq('id', traineeId)
            .maybeSingle();
        if (traineeError) throw traineeError;
        if (!trainee) {
            return NextResponse.json({ error: 'Trainee not found' }, { status: 404 });
        }

        const isLinked = trainee.trainer_id === auth.user.id;
        if (!isLinked && !(await isActiveCoachOf(auth.user.id, traineeId))) {
            return forbidden('This trainee is not one of your clients');
        }

        const { data: updatedProfile, error: updateError } = await getAdmin()
            .from('profiles')
            .update({ ai_features: features, updated_at: new Date().toISOString() })
            .eq('id', traineeId)
            .select()
            .single();
        if (updateError) throw updateError;

        return NextResponse.json({ success: true, profile: updatedProfile });

    } catch (error: unknown) {
        console.error('Update features error:', error);
        const message = error instanceof Error && error.message ? error.message : 'Internal Server Error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
