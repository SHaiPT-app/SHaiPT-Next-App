import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/supabaseDb';

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const userId = searchParams.get('userId');
        const countOnly = searchParams.get('countOnly');

        if (!userId) {
            return NextResponse.json({ error: 'userId is required' }, { status: 400 });
        }

        if (countOnly === 'true') {
            const count = await db.notifications.getUnreadCount(userId);
            return NextResponse.json({ count });
        }

        const notifications = await db.notifications.getByUser(userId);
        return NextResponse.json({ notifications });
    } catch (error: any) {
        console.error('Notifications fetch error:', error);
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
    }
}

export async function PATCH(req: NextRequest) {
    try {
        const { notificationId, userId, markAll } = await req.json();

        if (markAll && userId) {
            await db.notifications.markAllAsRead(userId);
            return NextResponse.json({ success: true });
        }

        if (notificationId) {
            const notification = await db.notifications.markAsRead(notificationId);
            return NextResponse.json({ notification });
        }

        return NextResponse.json({ error: 'notificationId or (userId + markAll) required' }, { status: 400 });
    } catch (error: any) {
        console.error('Notification update error:', error);
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
    }
}
