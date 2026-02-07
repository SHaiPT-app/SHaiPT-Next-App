import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function POST(req: NextRequest) {
    try {
        const { athleteId, coachId, intakeData, accessToken } = await req.json();

        if (!athleteId || !coachId) {
            return NextResponse.json({ error: 'athleteId and coachId are required' }, { status: 400 });
        }

        // Create authenticated client using the user's access token
        // This ensures RLS policies are evaluated as the authenticated user
        const supabase = createClient(supabaseUrl, supabaseAnonKey, {
            global: {
                headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
            },
            auth: { autoRefreshToken: false, persistSession: false }
        });

        // Validate coach exists and is a trainer
        const { data: coach, error: coachErr } = await supabase
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
        const { data: existing } = await supabase
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
        const { data: relationship, error: insertErr } = await supabase
            .from('coaching_relationships')
            .insert([{
                coach_id: coachId,
                athlete_id: athleteId,
                status: 'pending',
                requested_by: athleteId,
                intake_data: intakeData || null,
            }])
            .select()
            .single();

        if (insertErr) {
            console.error('Coaching insert error:', insertErr);
            throw insertErr;
        }

        // DB trigger notify_coaching_request auto-fires on INSERT

        return NextResponse.json({ relationship }, { status: 201 });
    } catch (error: any) {
        console.error('Coaching request error:', error);
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
    }
}
