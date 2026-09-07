import { NextResponse } from 'next/server';
import { getUser, isErrorResponse } from '@/lib/auth';

/** Profiles of the given role with no linked trainer whose username contains `q` (first 10). */
export async function GET(request: Request) {
    try {
        const auth = await getUser(request);
        if (isErrorResponse(auth)) return auth;

        const { searchParams } = new URL(request.url);
        const query = searchParams.get('q');
        const role = searchParams.get('role') || 'trainee';

        if (!query || query.length < 1) {
            return NextResponse.json({ users: [] });
        }

        // Escape LIKE wildcards so the search is a plain substring match
        const pattern = `%${query.replace(/[\\%_]/g, '\\$&')}%`;

        const { data, error } = await auth.supabase
            .from('profiles')
            .select('*')
            .eq('role', role)
            .is('trainer_id', null) // No trainer assigned yet
            .ilike('username', pattern)
            .order('created_at', { ascending: false })
            .limit(10);
        if (error) throw error;

        return NextResponse.json({ users: data || [] });
    } catch (error: unknown) {
        console.error('Search trainees error:', error);
        const message = error instanceof Error && error.message ? error.message : 'Internal server error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
