import { NextRequest, NextResponse } from 'next/server';
import { getUser, isErrorResponse } from '@/lib/auth';

function errorMessage(error: unknown): string {
    return error instanceof Error && error.message ? error.message : 'Internal server error';
}

/** The caller's notifications (`?countOnly=true` for the unread count). */
export async function GET(req: NextRequest) {
    try {
        const auth = await getUser(req);
        if (isErrorResponse(auth)) return auth;

        const { searchParams } = new URL(req.url);
        const countOnly = searchParams.get('countOnly');

        if (countOnly === 'true') {
            const { count, error } = await auth.supabase
                .from('notifications')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', auth.user.id)
                .eq('is_read', false);
            if (error) throw error;
            return NextResponse.json({ count: count || 0 });
        }

        const { data: notifications, error } = await auth.supabase
            .from('notifications')
            .select('*')
            .eq('user_id', auth.user.id)
            .order('created_at', { ascending: false })
            .limit(50);
        if (error) throw error;
        return NextResponse.json({ notifications: notifications || [] });
    } catch (error: unknown) {
        console.error('Notifications fetch error:', error);
        return NextResponse.json({ error: errorMessage(error) }, { status: 500 });
    }
}

/** Mark one notification (`notificationId`) or all of the caller's (`markAll`) as read. */
export async function PATCH(req: NextRequest) {
    try {
        const auth = await getUser(req);
        if (isErrorResponse(auth)) return auth;

        const { notificationId, markAll } = await req.json();

        if (markAll) {
            const { error } = await auth.supabase
                .from('notifications')
                .update({ is_read: true })
                .eq('user_id', auth.user.id)
                .eq('is_read', false);
            if (error) throw error;
            return NextResponse.json({ success: true });
        }

        if (notificationId) {
            const { data: notification, error } = await auth.supabase
                .from('notifications')
                .update({ is_read: true })
                .eq('id', notificationId)
                .eq('user_id', auth.user.id)
                .select()
                .single();
            if (error) throw error;
            return NextResponse.json({ notification });
        }

        return NextResponse.json({ error: 'notificationId or markAll required' }, { status: 400 });
    } catch (error: unknown) {
        console.error('Notification update error:', error);
        return NextResponse.json({ error: errorMessage(error) }, { status: 500 });
    }
}
