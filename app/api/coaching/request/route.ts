import { NextRequest, NextResponse } from 'next/server';
import { getUser, isErrorResponse } from '@/lib/auth';

/**
 * The caller (an athlete) asks `coachId` to coach them. The insert runs as the caller, so RLS
 * checks athlete_id/requested_by, and the SECURITY DEFINER trigger notifies the coach.
 */
export async function POST(req: NextRequest) {
    try {
        const auth = await getUser(req);
        if (isErrorResponse(auth)) return auth;
        const athleteId = auth.user.id;

        const { coachId } = await req.json();

        if (!coachId) {
            return NextResponse.json({ error: 'coachId is required' }, { status: 400 });
        }

        // Validate coach exists and is a trainer
        // public_profiles: the requester is not (yet) this coach's client, so they may see
        // only the storefront columns — which is all this check needs.
        const { data: coach, error: coachErr } = await auth.supabase
            .from('public_profiles')
            .select('id, role, full_name, is_accepting_clients')
            .eq('id', coachId)
            .single();
        if (coachErr || !coach || coach.role !== 'trainer') {
            return NextResponse.json({ error: 'Coach not found or not a trainer' }, { status: 404 });
        }

        // Check coach is accepting clients
        if (!coach.is_accepting_clients) {
            return NextResponse.json({ error: 'This coach is not currently accepting new clients' }, { status: 400 });
        }

        // Check for existing active/pending relationship
        const { data: existing } = await auth.supabase
            .from('coaching_relationships')
            .select('*')
            .eq('coach_id', coachId)
            .eq('athlete_id', athleteId)
            .in('status', ['pending', 'active', 'waitlisted'])
            .maybeSingle();

        if (existing) {
            return NextResponse.json({
                error: `You already have a ${existing.status} relationship with this coach`,
                status: existing.status
            }, { status: 409 });
        }

        const { data: relationship, error: insertErr } = await auth.supabase
            .from('coaching_relationships')
            .insert([{
                coach_id: coachId,
                athlete_id: athleteId,
                status: 'pending',
                requested_by: athleteId,
            }])
            .select()
            .single();

        if (insertErr) {
            console.error('Coaching insert error:', insertErr);
            throw insertErr;
        }

        return NextResponse.json({ relationship }, { status: 201 });
    } catch (error: unknown) {
        console.error('Coaching request error:', error);
        const message = error instanceof Error && error.message ? error.message : 'Internal server error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
