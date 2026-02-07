import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/supabaseDb';
import { supabase } from '@/lib/supabase';

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const userId = searchParams.get('userId');

        // Fetch all trainer profiles
        const trainers = await db.profiles.getTrainers();

        // If a userId is provided, fetch relationship statuses
        let relationships: Record<string, string> = {};
        if (userId) {
            const userRelationships = await db.coachingRelationships.getByUser(userId);
            for (const rel of userRelationships) {
                // Store the status keyed by coach_id (for the requesting user as athlete)
                if (rel.athlete_id === userId) {
                    relationships[rel.coach_id] = rel.status;
                }
            }
        }

        // Enrich trainer data with relationship status
        const enrichedTrainers = trainers.map(trainer => ({
            ...trainer,
            relationship_status: relationships[trainer.id] || null,
        }));

        return NextResponse.json({ trainers: enrichedTrainers });
    } catch (error: any) {
        console.error('Trainers fetch error:', error);
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
    }
}
