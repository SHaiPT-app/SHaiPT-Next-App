import { NextResponse } from 'next/server';
import { getUser, isErrorResponse } from '@/lib/auth';

/**
 * Trainee profiles: `?status=available` lists trainees with no trainer, `?trainerId=` lists the
 * caller's own trainees (the value is ignored: it is always the caller), otherwise every trainee.
 */
export async function GET(request: Request) {
    try {
        const auth = await getUser(request);
        if (isErrorResponse(auth)) return auth;

        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status'); // 'available' or undefined
        const trainerId = searchParams.get('trainerId');

        let query = auth.supabase
            .from('profiles')
            .select('*')
            .eq('role', 'trainee');

        if (status === 'available') {
            // Fetch trainees with NO trainer
            query = query.is('trainer_id', null);
        } else if (trainerId) {
            // Fetch the caller's trainees
            query = query.eq('trainer_id', auth.user.id);
        }

        const { data, error } = await query;

        if (error) throw error;

        return NextResponse.json({ trainees: data });

    } catch (error: unknown) {
        console.error('Fetch trainees error:', error);
        const message = error instanceof Error && error.message ? error.message : 'Internal Server Error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
