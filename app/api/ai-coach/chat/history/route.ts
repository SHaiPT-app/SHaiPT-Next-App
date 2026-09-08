/**
 * GET /api/ai-coach/chat/history → { chats } — every conversation of the caller, newest first.
 *
 * The caller comes from the token. The route used to take `?userId=`, which both trusted the
 * client and read through the anon client with no session, so it always answered `{"chats":[]}`.
 */
import { NextResponse } from 'next/server';
import { getUser, isErrorResponse } from '@/lib/auth';

export async function GET(req: Request) {
    const auth = await getUser(req);
    if (isErrorResponse(auth)) return auth;
    const { user, supabase } = auth;

    const { data, error } = await supabase
        .from('ai_chats')
        .select('id, title, messages, created_at, updated_at')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

    if (error) {
        console.error('[ai-coach/chat/history]', user.id, error.message);
        return NextResponse.json({ error: 'Failed to fetch chat history' }, { status: 500 });
    }
    return NextResponse.json({ chats: data ?? [] });
}
