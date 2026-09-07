import { NextRequest, NextResponse } from 'next/server';
import { getUser, isErrorResponse } from '@/lib/auth';

// `userId` in the query is ignored: lists are always the caller's.
export async function GET(req: NextRequest) {
    const auth = await getUser(req);
    if (isErrorResponse(auth)) return auth;

    try {
        const { data, error } = await auth.supabase
            .from('grocery_lists')
            .select('*')
            .eq('user_id', auth.user.id)
            .order('created_at', { ascending: false });
        if (error) throw error;

        return NextResponse.json({ lists: data || [] });
    } catch (error) {
        console.error('Error fetching grocery lists:', error);
        return NextResponse.json(
            { error: 'Failed to fetch grocery lists' },
            { status: 500 }
        );
    }
}

export async function PATCH(req: NextRequest) {
    const auth = await getUser(req);
    if (isErrorResponse(auth)) return auth;

    try {
        const body = await req.json();
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { id, user_id: _ignored, ...updates } = body;

        if (!id) {
            return NextResponse.json(
                { error: 'id is required' },
                { status: 400 }
            );
        }

        const { data: list, error } = await auth.supabase
            .from('grocery_lists')
            .update({ ...updates, updated_at: new Date().toISOString() })
            .eq('id', id)
            .eq('user_id', auth.user.id)
            .select()
            .single();
        if (error) throw error;

        return NextResponse.json({ list });
    } catch (error) {
        console.error('Error updating grocery list:', error);
        return NextResponse.json(
            { error: 'Failed to update grocery list' },
            { status: 500 }
        );
    }
}

export async function DELETE(req: NextRequest) {
    const auth = await getUser(req);
    if (isErrorResponse(auth)) return auth;

    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json(
                { error: 'id is required' },
                { status: 400 }
            );
        }

        const { error } = await auth.supabase
            .from('grocery_lists')
            .delete()
            .eq('id', id)
            .eq('user_id', auth.user.id);
        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting grocery list:', error);
        return NextResponse.json(
            { error: 'Failed to delete grocery list' },
            { status: 500 }
        );
    }
}
