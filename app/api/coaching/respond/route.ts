import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
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

        // Create service-role client lazily inside handler
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseUrl || !serviceKey) {
            console.error('Missing env vars:', { supabaseUrl: !!supabaseUrl, serviceKey: !!serviceKey });
            return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
        }

        const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
            auth: { autoRefreshToken: false, persistSession: false }
        });

        const statusMap: Record<string, CoachingStatus> = {
            accept: 'active',
            decline: 'declined',
            waitlist: 'waitlisted',
        };

        const updates: Record<string, any> = {
            status: statusMap[action],
            updated_at: new Date().toISOString(),
        };

        if (action === 'decline' && declineReason) {
            updates.decline_reason = declineReason;
        }

        const { data: relationship, error } = await supabaseAdmin
            .from('coaching_relationships')
            .update(updates)
            .eq('id', relationshipId)
            .select()
            .single();

        if (error) {
            console.error('Coaching respond error:', error);
            throw error;
        }

        // DB trigger notify_coaching_accepted auto-fires on UPDATE

        return NextResponse.json({ relationship });
    } catch (error: any) {
        console.error('Coaching respond error:', error);
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
    }
}
