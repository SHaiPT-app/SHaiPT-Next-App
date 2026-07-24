import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getClient(req: NextRequest) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || (!serviceKey && !anonKey)) {
        throw new Error('Missing Supabase configuration');
    }

    if (serviceKey) {
        return createClient(supabaseUrl, serviceKey, {
            auth: { autoRefreshToken: false, persistSession: false }
        });
    }

    // Fall back to anon key with user's auth token
    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');
    return createClient(supabaseUrl, anonKey!, {
        global: token ? { headers: { Authorization: `Bearer ${token}` } } : undefined,
        auth: { autoRefreshToken: false, persistSession: false }
    });
}

export async function GET(req: NextRequest) {
    try {
        const supabaseClient = getClient(req);

        const { searchParams } = new URL(req.url);
        const userId = searchParams.get('userId');
        const countOnly = searchParams.get('countOnly');

        if (!userId) {
            return NextResponse.json({ error: 'userId is required' }, { status: 400 });
        }

        if (countOnly === 'true') {
            const { count, error } = await supabaseClient
                .from('notifications')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', userId)
                .eq('is_read', false);
            if (error) throw error;
            return NextResponse.json({ count: count || 0 });
        }

        const { data: notifications, error } = await supabaseClient
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
        const supabaseClient = getClient(req);

        const { notificationId, userId, markAll } = await req.json();

        if (markAll && userId) {
            const { error } = await supabaseClient
                .from('notifications')
                .update({ is_read: true })
                .eq('user_id', userId)
                .eq('is_read', false);
            if (error) throw error;
            return NextResponse.json({ success: true });
        }

        if (notificationId) {
            const { data: notification, error } = await supabaseClient
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
