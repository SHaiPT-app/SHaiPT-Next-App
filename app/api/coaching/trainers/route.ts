import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;

function getClient() {
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    // Prefer service role, fall back to anon key (profiles are publicly readable)
    return createClient(supabaseUrl, serviceKey || anonKey, {
        auth: { autoRefreshToken: false, persistSession: false }
    });
}

export async function GET(req: NextRequest) {
    try {
        const supabaseAdmin = getClient();

        const { searchParams } = new URL(req.url);
        const userId = searchParams.get('userId');

        // Fetch all trainer profiles
        const { data: trainers, error: trainersErr } = await supabaseAdmin
            .from('profiles')
            .select('*')
            .eq('role', 'trainer')
            .order('full_name', { ascending: true });

        if (trainersErr) {
            console.error('Trainers query error:', trainersErr);
            throw trainersErr;
        }

        // If a userId is provided, fetch relationship statuses
        let relationships: Record<string, string> = {};
        if (userId) {
            const { data: rels, error: relsErr } = await supabaseAdmin
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
        }

        // Enrich trainer data with relationship status
        const enrichedTrainers = (trainers || []).map(trainer => ({
            ...trainer,
            relationship_status: relationships[trainer.id] || null,
        }));

        return NextResponse.json({ trainers: enrichedTrainers });
    } catch (error: any) {
        console.error('Trainers fetch error:', error);
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
    }
}
