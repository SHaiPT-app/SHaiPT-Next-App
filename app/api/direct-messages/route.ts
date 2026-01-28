import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('userId');
        const otherUserId = searchParams.get('otherUserId');

        if (!userId) {
            return NextResponse.json({ error: 'userId is required' }, { status: 400 });
        }

        const authHeader = request.headers.get('Authorization');
        if (!authHeader) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Verify coaching relationship exists between the two users
        if (otherUserId) {
            const { data: relationship, error: relError } = await supabase
                .from('coaching_relationships')
                .select('id')
                .or(
                    `and(coach_id.eq.${userId},athlete_id.eq.${otherUserId}),and(coach_id.eq.${otherUserId},athlete_id.eq.${userId})`
                )
                .eq('status', 'active')
                .limit(1);

            if (relError) throw relError;
            if (!relationship || relationship.length === 0) {
                return NextResponse.json(
                    { error: 'No active coaching relationship found' },
                    { status: 403 }
                );
            }

            // Get conversation between two users
            const { data: messages, error } = await supabase
                .from('direct_messages')
                .select('*')
                .or(
                    `and(sender_id.eq.${userId},recipient_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},recipient_id.eq.${userId})`
                )
                .order('created_at', { ascending: true });

            if (error) throw error;
            return NextResponse.json({ messages: messages || [] });
        }

        // Get all conversations for a user
        const { data: messages, error } = await supabase
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

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { senderId, recipientId, content } = body;

        if (!senderId || !recipientId || !content) {
            return NextResponse.json(
                { error: 'senderId, recipientId, and content are required' },
                { status: 400 }
            );
        }

        if (typeof content !== 'string' || content.trim().length === 0) {
            return NextResponse.json(
                { error: 'content must be a non-empty string' },
                { status: 400 }
            );
        }

        const authHeader = request.headers.get('Authorization');
        if (!authHeader) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Verify coaching relationship exists
        const { data: relationship, error: relError } = await supabase
            .from('coaching_relationships')
            .select('id')
            .or(
                `and(coach_id.eq.${senderId},athlete_id.eq.${recipientId}),and(coach_id.eq.${recipientId},athlete_id.eq.${senderId})`
            )
            .eq('status', 'active')
            .limit(1);

        if (relError) throw relError;
        if (!relationship || relationship.length === 0) {
            return NextResponse.json(
                { error: 'No active coaching relationship found' },
                { status: 403 }
            );
        }

        // Insert the message
        const { data: message, error } = await supabase
            .from('direct_messages')
            .insert([{
                sender_id: senderId,
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
