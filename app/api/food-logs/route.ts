import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/supabaseDb';

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const userId = searchParams.get('userId');
        const date = searchParams.get('date');
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');

        if (!userId) {
            return NextResponse.json(
                { error: 'userId is required' },
                { status: 400 }
            );
        }

        if (startDate && endDate) {
            const logs = await db.foodLogs.getByUserDateRange(userId, startDate, endDate);
            return NextResponse.json({ logs });
        }

        const logDate = date || new Date().toISOString().split('T')[0];
        const logs = await db.foodLogs.getByUserAndDate(userId, logDate);

        return NextResponse.json({ logs });
    } catch (error) {
        console.error('Error fetching food logs:', error);
        return NextResponse.json(
            { error: 'Failed to fetch food logs' },
            { status: 500 }
        );
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { user_id, food_id, food_name, meal_type, serving_size, serving_unit, calories, protein_g, carbs_g, fat_g, logged_date, notes } = body;

        if (!user_id || !food_name || !meal_type) {
            return NextResponse.json(
                { error: 'user_id, food_name, and meal_type are required' },
                { status: 400 }
            );
        }

        const validMealTypes = ['breakfast', 'lunch', 'dinner', 'snack'];
        if (!validMealTypes.includes(meal_type)) {
            return NextResponse.json(
                { error: 'meal_type must be breakfast, lunch, dinner, or snack' },
                { status: 400 }
            );
        }

        const log = await db.foodLogs.create({
            user_id,
            food_id: food_id || undefined,
            food_name,
            meal_type,
            serving_size: serving_size || 1,
            serving_unit: serving_unit || 'serving',
            calories: calories || 0,
            protein_g: protein_g || 0,
            carbs_g: carbs_g || 0,
            fat_g: fat_g || 0,
            logged_date: logged_date || new Date().toISOString().split('T')[0],
            notes,
        });

        return NextResponse.json({ log }, { status: 201 });
    } catch (error) {
        console.error('Error creating food log:', error);
        return NextResponse.json(
            { error: 'Failed to create food log' },
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

        await db.foodLogs.delete(id);
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting food log:', error);
        return NextResponse.json(
            { error: 'Failed to delete food log' },
            { status: 500 }
        );
    }
}
