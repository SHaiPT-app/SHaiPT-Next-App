import { NextRequest, NextResponse } from 'next/server';
import { getUser, isErrorResponse } from '@/lib/auth';

// Get workout draft
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ logId: string }> }
) {
    const auth = await getUser(request);
    if (isErrorResponse(auth)) return auth;

    try {
        const { logId } = await params;

        const { data: draft, error } = await auth.supabase
            .from('workout_drafts')
            .select('*')
            .eq('workout_log_id', logId)
            .eq('user_id', auth.user.id)
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
    const auth = await getUser(request);
    if (isErrorResponse(auth)) return auth;

    try {
        const { logId } = await params;
        const body = await request.json();
        // user_id in the body is ignored: the draft belongs to the caller.
        const { session_id, draft_data, device_id } = body;

        if (!draft_data) {
            return NextResponse.json(
                { error: 'Missing required field: draft_data' },
                { status: 400 }
            );
        }

        const { data: draft, error } = await auth.supabase
            .from('workout_drafts')
            .upsert({
                user_id: auth.user.id,
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
