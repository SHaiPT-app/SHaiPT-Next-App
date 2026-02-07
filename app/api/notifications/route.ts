import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET(req: NextRequest) {
    try {
        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
            auth: { autoRefreshToken: false, persistSession: false }
        });

        const { searchParams } = new URL(req.url);
        const userId = searchParams.get('userId');
        const countOnly = searchParams.get('countOnly');

        if (!userId) {
            return NextResponse.json({ error: 'userId is required' }, { status: 400 });
        }

        if (countOnly === 'true') {
            const { count, error } = await supabaseAdmin
                .from('notifications')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', userId)
                .eq('is_read', false);
            if (error) throw error;
            return NextResponse.json({ count: count || 0 });
        }

        const { data: notifications, error } = await supabaseAdmin
            .from('notifications')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(50);
        if (error) throw error;
        return NextResponse.json({ notifications: notifications || [] });
    } catch (error: any) {
        console.error('Notifications fetch error:', error);
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
    }
}

export async function PATCH(req: NextRequest) {
    try {
        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
            auth: { autoRefreshToken: false, persistSession: false }
        });

        const { notificationId, userId, markAll } = await req.json();

        if (markAll && userId) {
            const { error } = await supabaseAdmin
                .from('notifications')
                .update({ is_read: true })
                .eq('user_id', userId)
                .eq('is_read', false);
            if (error) throw error;
            return NextResponse.json({ success: true });
        }

        if (notificationId) {
            const { data: notification, error } = await supabaseAdmin
                .from('notifications')
                .update({ is_read: true })
                .eq('id', notificationId)
                .select()
                .single();
            if (error) throw error;
            return NextResponse.json({ notification });
        }

        return NextResponse.json({ error: 'notificationId or (userId + markAll) required' }, { status: 400 });
    } catch (error: any) {
        console.error('Notification update error:', error);
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
    }
}
