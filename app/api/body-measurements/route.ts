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

        const measurements = await db.bodyMeasurements.getByUser(userId);
        return NextResponse.json({ measurements });
    } catch (error) {
        console.error('Error fetching body measurements:', error);
        return NextResponse.json(
            { error: 'Failed to fetch body measurements' },
            { status: 500 }
        );
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { user_id, date, ...measurementData } = body;

        if (!user_id) {
            return NextResponse.json(
                { error: 'user_id is required' },
                { status: 400 }
            );
        }

        const measurement = await db.bodyMeasurements.create({
            user_id,
            date: date || new Date().toISOString().split('T')[0],
            ...measurementData,
        });

        return NextResponse.json({ measurement }, { status: 201 });
    } catch (error) {
        console.error('Error creating body measurement:', error);
        return NextResponse.json(
            { error: 'Failed to create body measurement' },
            { status: 500 }
        );
    }
}

export async function PUT(req: NextRequest) {
    try {
        const body = await req.json();
        const { id, ...updates } = body;

        if (!id) {
            return NextResponse.json(
                { error: 'id is required' },
                { status: 400 }
            );
        }

        const measurement = await db.bodyMeasurements.update(id, updates);
        return NextResponse.json({ measurement });
    } catch (error) {
        console.error('Error updating body measurement:', error);
        return NextResponse.json(
            { error: 'Failed to update body measurement' },
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

        await db.bodyMeasurements.delete(id);
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting body measurement:', error);
        return NextResponse.json(
            { error: 'Failed to delete body measurement' },
            { status: 500 }
        );
    }
}
