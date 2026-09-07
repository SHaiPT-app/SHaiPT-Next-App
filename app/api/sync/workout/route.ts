import { NextRequest, NextResponse } from 'next/server';
import { getUser, isErrorResponse } from '@/lib/auth';

// Get workout draft from server. `userId` in the query is ignored: drafts are the caller's.
export async function GET(request: NextRequest) {
    const auth = await getUser(request);
    if (isErrorResponse(auth)) return auth;

    try {
        const { searchParams } = new URL(request.url);
        const sessionId = searchParams.get('sessionId');

        let query = auth.supabase
            .from('workout_drafts')
            .select('*')
            .eq('user_id', auth.user.id);

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
    const auth = await getUser(request);
    if (isErrorResponse(auth)) return auth;

    try {
        const body = await request.json();
        // userId in the body is ignored: the draft belongs to the caller.
        const { sessionId, data, deviceId } = body;

        if (!sessionId || !data) {
            return NextResponse.json(
                { error: 'Missing required fields: sessionId, data' },
                { status: 400 }
            );
        }

        const { data: draft, error } = await auth.supabase
            .from('workout_drafts')
            .upsert({
                user_id: auth.user.id,
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
    const auth = await getUser(request);
    if (isErrorResponse(auth)) return auth;

    try {
        const { searchParams } = new URL(request.url);
        const sessionId = searchParams.get('sessionId');

        if (!sessionId) {
            return NextResponse.json(
                { error: 'Missing required parameter: sessionId' },
                { status: 400 }
            );
        }

        const { error } = await auth.supabase
            .from('workout_drafts')
            .delete()
            .eq('user_id', auth.user.id)
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
