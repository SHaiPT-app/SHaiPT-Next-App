import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/supabaseDb';

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const userId = searchParams.get('userId');

        if (!userId) {
            return NextResponse.json(
                { error: 'userId is required' },
                { status: 400 }
            );
        }

        const lists = await db.groceryLists.getByUser(userId);
        return NextResponse.json({ lists });
    } catch (error) {
        console.error('Error fetching grocery lists:', error);
        return NextResponse.json(
            { error: 'Failed to fetch grocery lists' },
            { status: 500 }
        );
    }
}

export async function PATCH(req: NextRequest) {
    try {
        const body = await req.json();
        const { id, ...updates } = body;

        if (!id) {
            return NextResponse.json(
                { error: 'id is required' },
                { status: 400 }
            );
        }

        const list = await db.groceryLists.update(id, updates);
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
    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json(
                { error: 'id is required' },
                { status: 400 }
            );
        }

        await db.groceryLists.delete(id);
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting grocery list:', error);
        return NextResponse.json(
            { error: 'Failed to delete grocery list' },
            { status: 500 }
        );
    }
}
