import { NextResponse } from 'next/server';
import { getUser, isErrorResponse, type AuthContext } from '@/lib/auth';

/** Is there an active coaching relationship between the caller and `otherUserId`? */
async function hasActiveRelationship(auth: AuthContext, otherUserId: string): Promise<boolean> {
    const userId = auth.user.id;
    const { data: relationship, error } = await auth.supabase
        .from('coaching_relationships')
        .select('id')
        .or(
            `and(coach_id.eq.${userId},athlete_id.eq.${otherUserId}),and(coach_id.eq.${otherUserId},athlete_id.eq.${userId})`
        )
        .eq('status', 'active')
        .limit(1);
    if (error) throw error;
    return !!relationship && relationship.length > 0;
}

export async function GET(request: Request) {
    try {
        const auth = await getUser(request);
        if (isErrorResponse(auth)) return auth;
        const userId = auth.user.id;

        const { searchParams } = new URL(request.url);
        const otherUserId = searchParams.get('otherUserId');

        if (otherUserId) {
            if (!(await hasActiveRelationship(auth, otherUserId))) {
                return NextResponse.json(
                    { error: 'No active coaching relationship found' },
                    { status: 403 }
                );
            }

            // Get conversation between two users
            const { data: messages, error } = await auth.supabase
                .from('direct_messages')
                .select('*')
                .or(
                    `and(sender_id.eq.${userId},recipient_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},recipient_id.eq.${userId})`
                )
                .order('created_at', { ascending: true });

            if (error) throw error;
            return NextResponse.json({ messages: messages || [] });
        }

        // Get all conversations for the caller
        const { data: messages, error } = await auth.supabase
            .from('direct_messages')
            .select('*')
            .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
            .order('created_at', { ascending: false });

        if (error) throw error;

        // Group by conversation partner and return latest message per conversation
        const conversationMap = new Map<string, typeof messages[0]>();
        for (const msg of messages || []) {
            const partnerId = msg.sender_id === userId ? msg.recipient_id : msg.sender_id;
            if (!conversationMap.has(partnerId)) {
                conversationMap.set(partnerId, msg);
            }
        }

        const conversations = Array.from(conversationMap.entries()).map(([partnerId, lastMessage]) => ({
            partnerId,
            lastMessage,
        }));

        return NextResponse.json({ conversations });
    } catch (error: unknown) {
        console.error('Direct messages GET error:', error);
        const message = error instanceof Error ? error.message : 'Internal Server Error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

/** Send a message from the caller to `recipientId`. The new-message notification comes from a trigger. */
export async function POST(request: Request) {
    try {
        const auth = await getUser(request);
        if (isErrorResponse(auth)) return auth;

        const body = await request.json();
        const { recipientId, content } = body;

        if (!recipientId || !content) {
            return NextResponse.json(
                { error: 'recipientId and content are required' },
                { status: 400 }
            );
        }

        if (typeof content !== 'string' || content.trim().length === 0) {
            return NextResponse.json(
                { error: 'content must be a non-empty string' },
                { status: 400 }
            );
        }

        if (!(await hasActiveRelationship(auth, recipientId))) {
            return NextResponse.json(
                { error: 'No active coaching relationship found' },
                { status: 403 }
            );
        }

        const { data: message, error } = await auth.supabase
            .from('direct_messages')
            .insert([{
                sender_id: auth.user.id,
                recipient_id: recipientId,
                content: content.trim(),
            }])
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({ message }, { status: 201 });
    } catch (error: unknown) {
        console.error('Direct messages POST error:', error);
        const message = error instanceof Error ? error.message : 'Internal Server Error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
