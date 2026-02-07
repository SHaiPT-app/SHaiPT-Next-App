import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/supabaseDb';

export async function POST(req: NextRequest) {
    try {
        const { athleteId, coachId, intakeData } = await req.json();

        if (!athleteId || !coachId) {
            return NextResponse.json({ error: 'athleteId and coachId are required' }, { status: 400 });
        }

        // Validate coach exists and is a trainer
        const coach = await db.profiles.getById(coachId);
        if (!coach || coach.role !== 'trainer') {
            return NextResponse.json({ error: 'Coach not found or not a trainer' }, { status: 404 });
        }

        // Check coach is accepting clients
        if (!coach.is_accepting_clients) {
            return NextResponse.json({ error: 'This coach is not currently accepting new clients' }, { status: 400 });
        }

        // Check for existing active/pending relationship
        const existing = await db.coachingRelationships.getByCoachAndAthlete(coachId, athleteId);
        if (existing) {
            return NextResponse.json({
                error: `You already have a ${existing.status} relationship with this coach`,
                status: existing.status
            }, { status: 409 });
        }

        // Create the coaching relationship
        const relationship = await db.coachingRelationships.create({
            coach_id: coachId,
            athlete_id: athleteId,
            status: 'pending',
            requested_by: athleteId,
            intake_data: intakeData || undefined,
        });

        // DB trigger notify_coaching_request auto-fires on INSERT

        return NextResponse.json({ relationship }, { status: 201 });
    } catch (error: any) {
        console.error('Coaching request error:', error);
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
    }
}
