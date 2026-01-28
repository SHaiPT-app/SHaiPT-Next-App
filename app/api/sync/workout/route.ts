import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Get workout draft from server
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('userId');
        const sessionId = searchParams.get('sessionId');

        if (!userId) {
            return NextResponse.json(
                { error: 'Missing required parameter: userId' },
                { status: 400 }
            );
        }

        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        let query = supabase
            .from('workout_drafts')
            .select('*')
            .eq('user_id', userId);

        if (sessionId) {
            query = query.eq('session_id', sessionId);
        }

        const { data: drafts, error } = await query.order('updated_at', { ascending: false });

        if (error) {
            console.error('Failed to fetch drafts:', error);
            return NextResponse.json(
                { error: 'Failed to fetch drafts' },
                { status: 500 }
            );
        }

        if (sessionId && drafts && drafts.length > 0) {
            return NextResponse.json(drafts[0].draft_data);
        }

        return NextResponse.json(drafts || []);
    } catch (error) {
        console.error('Error fetching workout drafts:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

// Save workout draft to server
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { userId, sessionId, data, deviceId } = body;

        if (!userId || !sessionId || !data) {
            return NextResponse.json(
                { error: 'Missing required fields: userId, sessionId, data' },
                { status: 400 }
            );
        }

        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        const { data: draft, error } = await supabase
            .from('workout_drafts')
            .upsert({
                user_id: userId,
                session_id: sessionId,
                draft_data: data,
                device_id: deviceId,
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
        console.error('Error saving workout draft:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

// Delete workout draft from server
export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('userId');
        const sessionId = searchParams.get('sessionId');

        if (!userId || !sessionId) {
            return NextResponse.json(
                { error: 'Missing required parameters: userId, sessionId' },
                { status: 400 }
            );
        }

        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        const { error } = await supabase
            .from('workout_drafts')
            .delete()
            .eq('user_id', userId)
            .eq('session_id', sessionId);

        if (error) {
            console.error('Failed to delete draft:', error);
            return NextResponse.json(
                { error: 'Failed to delete draft' },
                { status: 500 }
            );
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting workout draft:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
