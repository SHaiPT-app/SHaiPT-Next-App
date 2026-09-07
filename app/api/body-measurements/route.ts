import { NextRequest, NextResponse } from 'next/server';
import { getUser, isErrorResponse } from '@/lib/auth';

// `userId` in the query is ignored: measurements are always the caller's.
export async function GET(req: NextRequest) {
    const auth = await getUser(req);
    if (isErrorResponse(auth)) return auth;

    try {
        const { data, error } = await auth.supabase
            .from('body_measurements')
            .select('*')
            .eq('user_id', auth.user.id)
            .order('date', { ascending: false })
            .limit(100);
        if (error) throw error;

        return NextResponse.json({ measurements: data || [] });
    } catch (error) {
        console.error('Error fetching body measurements:', error);
        return NextResponse.json(
            { error: 'Failed to fetch body measurements' },
            { status: 500 }
        );
    }
}

export async function POST(req: NextRequest) {
    const auth = await getUser(req);
    if (isErrorResponse(auth)) return auth;

    try {
        const body = await req.json();
        // user_id in the body is ignored: the row belongs to the caller.
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { user_id: _ignored, date, ...measurementData } = body;

        const { data, error } = await auth.supabase
            .from('body_measurements')
            .insert([{
                user_id: auth.user.id,
                date: date || new Date().toISOString().split('T')[0],
                ...measurementData,
            }])
            .select()
            .single();
        if (error) throw error;

        return NextResponse.json({ measurement: data }, { status: 201 });
    } catch (error) {
        console.error('Error creating body measurement:', error);
        return NextResponse.json(
            { error: 'Failed to create body measurement' },
            { status: 500 }
        );
    }
}

export async function PUT(req: NextRequest) {
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

        const { data, error } = await auth.supabase
            .from('body_measurements')
            .update({ ...updates, updated_at: new Date().toISOString() })
            .eq('id', id)
            .eq('user_id', auth.user.id)
            .select()
            .single();
        if (error) throw error;

        return NextResponse.json({ measurement: data });
    } catch (error) {
        console.error('Error updating body measurement:', error);
        return NextResponse.json(
            { error: 'Failed to update body measurement' },
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
            .from('body_measurements')
            .delete()
            .eq('id', id)
            .eq('user_id', auth.user.id);
        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting body measurement:', error);
        return NextResponse.json(
            { error: 'Failed to delete body measurement' },
            { status: 500 }
        );
    }
}
