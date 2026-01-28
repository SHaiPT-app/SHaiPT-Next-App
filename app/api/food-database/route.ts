import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/supabaseDb';

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const query = searchParams.get('q');
        const category = searchParams.get('category');

        if (category) {
            const foods = await db.foodDatabase.getByCategory(category);
            return NextResponse.json({ foods });
        }

        if (!query || query.length < 2) {
            return NextResponse.json(
                { error: 'Search query must be at least 2 characters' },
                { status: 400 }
            );
        }

        const foods = await db.foodDatabase.search(query);
        return NextResponse.json({ foods });
    } catch (error) {
        console.error('Error searching food database:', error);
        return NextResponse.json(
            { error: 'Failed to search food database' },
            { status: 500 }
        );
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { name, brand, category, serving_size, serving_unit, calories, protein_g, carbs_g, fat_g, fiber_g, sugar_g, sodium_mg, created_by } = body;

        if (!name) {
            return NextResponse.json(
                { error: 'Food name is required' },
                { status: 400 }
            );
        }

        const food = await db.foodDatabase.create({
            name,
            brand,
            category,
            serving_size: serving_size || 100,
            serving_unit: serving_unit || 'g',
            calories: calories || 0,
            protein_g: protein_g || 0,
            carbs_g: carbs_g || 0,
            fat_g: fat_g || 0,
            fiber_g,
            sugar_g,
            sodium_mg,
            created_by,
            is_verified: false,
        });

        return NextResponse.json({ food }, { status: 201 });
    } catch (error) {
        console.error('Error creating food item:', error);
        return NextResponse.json(
            { error: 'Failed to create food item' },
            { status: 500 }
        );
    }
}
