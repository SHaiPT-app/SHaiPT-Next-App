import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
    try {
        const { athleteId, coachId } = await req.json();

        if (!athleteId || !coachId) {
            return NextResponse.json({ error: 'athleteId and coachId are required' }, { status: 400 });
        }

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

        if (!supabaseUrl || (!serviceKey && !anonKey)) {
            return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
        }

        // Prefer service-role key (bypasses RLS), fall back to user's auth token + anon key
        // When using anon key, the SECURITY DEFINER trigger functions handle cross-user notification inserts
        let supabaseAdmin;
        if (serviceKey) {
            supabaseAdmin = createClient(supabaseUrl, serviceKey, {
                auth: { autoRefreshToken: false, persistSession: false }
            });
        } else {
            const authHeader = req.headers.get('Authorization');
            if (!authHeader) {
                return NextResponse.json({ error: 'Authorization required' }, { status: 401 });
            }
            const token = authHeader.replace('Bearer ', '');
            supabaseAdmin = createClient(supabaseUrl, anonKey!, {
                global: { headers: { Authorization: `Bearer ${token}` } },
                auth: { autoRefreshToken: false, persistSession: false }
            });
        }

        // Validate coach exists and is a trainer
        const { data: coach, error: coachErr } = await supabaseAdmin
            .from('profiles')
            .select('*')
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
        const { data: existing } = await supabaseAdmin
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

        // Create the coaching relationship
        // When using anon key + user token, the SECURITY DEFINER trigger functions
        // handle inserting notifications for the coach (cross-user insert)
        const { data: relationship, error: insertErr } = await supabaseAdmin
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
    } catch (error: any) {
        console.error('Coaching request error:', error);
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
    }
}
