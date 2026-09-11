import { NextRequest, NextResponse } from 'next/server';
import { getUser, isErrorResponse } from '@/lib/auth';

/** Every trainer profile, each with the caller's relationship status to that trainer. */
export async function GET(req: NextRequest) {
    try {
        const auth = await getUser(req);
        if (isErrorResponse(auth)) return auth;
        const userId = auth.user.id;

        // Fetch all trainer profiles. A trainer's storefront is public by design, but the
        // rest of their row is not — public_profiles carries only the storefront columns.
        const { data: trainers, error: trainersErr } = await auth.supabase
            .from('public_profiles')
            .select('id, username, full_name, avatar_url, bio, role, trainer_id, created_at, specialties, availability_status, is_accepting_clients, rating, trainer_bio')
            .eq('role', 'trainer')
            .order('full_name', { ascending: true });

        if (trainersErr) {
            console.error('Trainers query error:', trainersErr);
            throw trainersErr;
        }

        // The caller's own relationships (RLS: coach or athlete)
        const relationships: Record<string, string> = {};
        const { data: rels, error: relsErr } = await auth.supabase
            .from('coaching_relationships')
            .select('*')
            .or(`coach_id.eq.${userId},athlete_id.eq.${userId}`);

        if (!relsErr && rels) {
            for (const rel of rels) {
                if (rel.athlete_id === userId) {
                    relationships[rel.coach_id] = rel.status;
                }
            }
        }

        // Enrich trainer data with relationship status
        const enrichedTrainers = (trainers || []).map(trainer => ({
            ...trainer,
            relationship_status: relationships[trainer.id] || null,
        }));

        return NextResponse.json({ trainers: enrichedTrainers });
    } catch (error: unknown) {
        console.error('Trainers fetch error:', error);
        const message = error instanceof Error && error.message ? error.message : 'Internal server error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
