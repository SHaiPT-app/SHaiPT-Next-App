import { NextRequest, NextResponse } from 'next/server';
import { forbidden, getUser, isErrorResponse } from '@/lib/auth';
import type { CoachingStatus } from '@/lib/types';

/**
 * Accept, decline or waitlist a coaching request. The caller must be a party of the relationship
 * and not the side that requested it. The update runs as the caller (RLS: coach or athlete), and
 * the SECURITY DEFINER trigger notifies the other side on accept.
 */
export async function POST(req: NextRequest) {
    try {
        const auth = await getUser(req);
        if (isErrorResponse(auth)) return auth;

        const { relationshipId, action, declineReason } = await req.json();

        if (!relationshipId || !action) {
            return NextResponse.json({ error: 'relationshipId and action are required' }, { status: 400 });
        }

        const validActions = ['accept', 'decline', 'waitlist'];
        if (!validActions.includes(action)) {
            return NextResponse.json({ error: `action must be one of: ${validActions.join(', ')}` }, { status: 400 });
        }

        // RLS only returns the row when the caller is the coach or the athlete
        const { data: existing, error: fetchErr } = await auth.supabase
            .from('coaching_relationships')
            .select('id, coach_id, athlete_id, requested_by')
            .eq('id', relationshipId)
            .maybeSingle();
        if (fetchErr) throw fetchErr;
        if (!existing) {
            return NextResponse.json({ error: 'Coaching relationship not found' }, { status: 404 });
        }
        if (existing.coach_id !== auth.user.id && existing.athlete_id !== auth.user.id) {
            return forbidden('You are not a party of this coaching relationship');
        }
        if (existing.requested_by === auth.user.id) {
            return forbidden('The side that sent the request cannot respond to it');
        }

        const statusMap: Record<string, CoachingStatus> = {
            accept: 'active',
            decline: 'declined',
            waitlist: 'waitlisted',
        };

        const updates: Record<string, unknown> = {
            status: statusMap[action],
            updated_at: new Date().toISOString(),
        };

        if (action === 'decline' && declineReason) {
            updates.decline_reason = declineReason;
        }

        const { data: relationship, error } = await auth.supabase
            .from('coaching_relationships')
            .update(updates)
            .eq('id', relationshipId)
            .select()
            .single();

        if (error) {
            console.error('Coaching respond error:', error);
            throw error;
        }

        return NextResponse.json({ relationship });
    } catch (error: unknown) {
        console.error('Coaching respond error:', error);
        const message = error instanceof Error && error.message ? error.message : 'Internal server error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
