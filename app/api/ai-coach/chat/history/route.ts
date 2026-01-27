import { db } from '@/lib/supabaseDb';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
    try {
        const userId = req.nextUrl.searchParams.get('userId');

        if (!userId) {
            return NextResponse.json(
                { error: 'userId is required' },
                { status: 400 }
            );
        }

        const chats = await db.aiChats.getByUser(userId);

        return NextResponse.json({ chats });
    } catch (error: unknown) {
        console.error('Failed to fetch chat history:', error);
        const message = error instanceof Error ? error.message : 'Failed to fetch chat history';
        return NextResponse.json(
            { error: message },
            { status: 500 }
        );
    }
}
