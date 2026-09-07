import { NextResponse } from 'next/server';
import { forbidden, getAdmin, getUser, isErrorResponse } from '@/lib/auth';

/**
 * Link or unlink a trainee and a trainer (profiles.trainer_id). The caller must be the trainee
 * or the trainer of the link. A trainee updates their own profile under RLS; a trainer writes
 * the trainee's row with the service role, after the check above.
 */
export async function POST(request: Request) {
    try {
        const auth = await getUser(request);
        if (isErrorResponse(auth)) return auth;

        const body = await request.json();
        const { trainerId, traineeUsername, action } = body;
        let { traineeId } = body;

        if (!trainerId || (!traineeId && !traineeUsername) || !action) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        if (action !== 'link' && action !== 'unlink') {
            return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
        }

        // Lookup traineeId if only username is provided (every signed-in user may read profiles)
        if (!traineeId && traineeUsername) {
            const { data: trainee, error } = await auth.supabase
                .from('profiles')
                .select('id')
                .eq('username', traineeUsername)
                .maybeSingle();
            if (error) throw error;
            if (!trainee) {
                return NextResponse.json({ error: `User with username "${traineeUsername}" not found` }, { status: 404 });
            }
            traineeId = trainee.id;
        }

        // Only the trainer or the trainee of the link may change it
        const callerIsTrainee = auth.user.id === traineeId;
        const callerIsTrainer = auth.user.id === trainerId;
        if (!callerIsTrainee && !callerIsTrainer) {
            return forbidden('You can only modify your own connections');
        }

        // A trainer may only unlink a trainee who is actually linked to them
        if (action === 'unlink' && !callerIsTrainee) {
            const { data: trainee, error } = await auth.supabase
                .from('profiles')
                .select('trainer_id')
                .eq('id', traineeId)
                .maybeSingle();
            if (error) throw error;
            if (!trainee || trainee.trainer_id !== auth.user.id) {
                return forbidden('This trainee is not linked to you');
            }
        }

        const client = callerIsTrainee ? auth.supabase : getAdmin();
        const { error: updateError } = await client
            .from('profiles')
            .update({
                trainer_id: action === 'link' ? trainerId : null,
                updated_at: new Date().toISOString(),
            })
            .eq('id', traineeId);
        if (updateError) throw updateError;

        return NextResponse.json({ success: true });

    } catch (error: unknown) {
        console.error('Link error:', error);
        const message = error instanceof Error && error.message ? error.message : 'Internal Server Error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
