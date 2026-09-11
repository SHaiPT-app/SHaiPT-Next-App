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

        // public_profiles, not profiles: this searches strangers, and select('*') here used to
        // hand back their email, date of birth, height and weight (see migration 0170).
        const { data, error } = await auth.supabase
            .from('public_profiles')
            .select('id, username, full_name, avatar_url, bio, role, trainer_id, created_at')
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
