import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Get workout draft
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ logId: string }> }
) {
    try {
        const { logId } = await params;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        const { data: draft, error } = await supabase
            .from('workout_drafts')
            .select('*')
            .eq('workout_log_id', logId)
            .single();

        if (error && error.code !== 'PGRST116') {
            console.error('Failed to fetch draft:', error);
            return NextResponse.json(
                { error: 'Failed to fetch draft' },
                { status: 500 }
            );
        }

        return NextResponse.json({ draft });
    } catch (error) {
        console.error('Error fetching draft:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

// Update workout draft
export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ logId: string }> }
) {
    try {
        const { logId } = await params;
        const body = await request.json();
        const { user_id, session_id, draft_data, device_id } = body;

        if (!user_id || !draft_data) {
            return NextResponse.json(
                { error: 'Missing required fields: user_id, draft_data' },
                { status: 400 }
            );
        }

        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        const { data: draft, error } = await supabase
            .from('workout_drafts')
            .upsert({
                user_id,
                workout_log_id: logId,
                session_id,
                draft_data,
                device_id,
                last_synced_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            }, { onConflict: 'user_id,session_id' })
            .select()
            .single();

        if (error) {
            console.error('Failed to save draft:', error);
            return NextResponse.json(
                { error: 'Failed to save draft' },
                { status: 500 }
            );
        }

        return NextResponse.json({ draft });
    } catch (error) {
        console.error('Error saving draft:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
