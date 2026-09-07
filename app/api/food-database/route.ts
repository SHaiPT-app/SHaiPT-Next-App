import { NextRequest, NextResponse } from 'next/server';
import { getUser, isErrorResponse } from '@/lib/auth';

export async function GET(req: NextRequest) {
    const auth = await getUser(req);
    if (isErrorResponse(auth)) return auth;

    try {
        const { searchParams } = new URL(req.url);
        const query = searchParams.get('q');
        const category = searchParams.get('category');

        if (category) {
            const { data, error } = await auth.supabase
                .from('food_database')
                .select('*')
                .eq('category', category)
                .order('name');
            if (error) throw error;
            return NextResponse.json({ foods: data || [] });
        }

        if (!query || query.length < 2) {
            return NextResponse.json(
                { error: 'Search query must be at least 2 characters' },
                { status: 400 }
            );
        }

        const { data, error } = await auth.supabase
            .from('food_database')
            .select('*')
            .ilike('name', `%${query}%`)
            .order('is_verified', { ascending: false })
            .order('name')
            .limit(20);
        if (error) throw error;
        return NextResponse.json({ foods: data || [] });
    } catch (error) {
        console.error('Error searching food database:', error);
        return NextResponse.json(
            { error: 'Failed to search food database' },
            { status: 500 }
        );
    }
}

export async function POST(req: NextRequest) {
    const auth = await getUser(req);
    if (isErrorResponse(auth)) return auth;

    try {
        const body = await req.json();
        // created_by in the body is ignored: the row is attributed to the caller.
        const { name, brand, category, serving_size, serving_unit, calories, protein_g, carbs_g, fat_g, fiber_g, sugar_g, sodium_mg } = body;

        if (!name) {
            return NextResponse.json(
                { error: 'Food name is required' },
                { status: 400 }
            );
        }

        const { data: food, error } = await auth.supabase
            .from('food_database')
            .insert([{
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
                created_by: auth.user.id,
                is_verified: false,
            }])
            .select()
            .single();
        if (error) throw error;

        return NextResponse.json({ food }, { status: 201 });
    } catch (error) {
        console.error('Error creating food item:', error);
        return NextResponse.json(
            { error: 'Failed to create food item' },
            { status: 500 }
        );
    }
}
