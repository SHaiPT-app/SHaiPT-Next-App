import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/supabaseDb';
import type { CoachingStatus } from '@/lib/types';

export async function POST(req: NextRequest) {
    try {
        const { relationshipId, action, declineReason } = await req.json();

        if (!relationshipId || !action) {
            return NextResponse.json({ error: 'relationshipId and action are required' }, { status: 400 });
        }

        const validActions = ['accept', 'decline', 'waitlist'];
        if (!validActions.includes(action)) {
            return NextResponse.json({ error: `action must be one of: ${validActions.join(', ')}` }, { status: 400 });
        }

        const statusMap: Record<string, CoachingStatus> = {
            accept: 'active',
            decline: 'declined',
            waitlist: 'waitlisted',
        };

        const updates: Record<string, any> = {
            status: statusMap[action],
        };

        if (action === 'decline' && declineReason) {
            updates.decline_reason = declineReason;
        }

        const relationship = await db.coachingRelationships.update(relationshipId, updates);

        // DB trigger notify_coaching_accepted auto-fires on UPDATE

        return NextResponse.json({ relationship });
    } catch (error: any) {
        console.error('Coaching respond error:', error);
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
    }
}
