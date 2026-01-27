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

        const plan = await db.nutritionPlans.getLatestByUser(userId);

        return NextResponse.json({ plan: plan || null });
    } catch (error) {
        console.error('Error fetching nutrition plan:', error);
        return NextResponse.json(
            { error: 'Failed to fetch nutrition plan' },
            { status: 500 }
        );
    }
}
