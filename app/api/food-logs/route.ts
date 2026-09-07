import { NextRequest, NextResponse } from 'next/server';
import { getUser, isErrorResponse } from '@/lib/auth';

// `userId` in the query is ignored: logs are always the caller's.
export async function GET(req: NextRequest) {
    const auth = await getUser(req);
    if (isErrorResponse(auth)) return auth;

    try {
        const { searchParams } = new URL(req.url);
        const date = searchParams.get('date');
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');

        if (startDate && endDate) {
            const { data, error } = await auth.supabase
                .from('food_logs')
                .select('*')
                .eq('user_id', auth.user.id)
                .gte('logged_date', startDate)
                .lte('logged_date', endDate)
                .order('logged_date', { ascending: true })
                .order('created_at', { ascending: true });
            if (error) throw error;
            return NextResponse.json({ logs: data || [] });
        }

        const logDate = date || new Date().toISOString().split('T')[0];
        const { data, error } = await auth.supabase
            .from('food_logs')
            .select('*')
            .eq('user_id', auth.user.id)
            .eq('logged_date', logDate)
            .order('created_at', { ascending: true });
        if (error) throw error;

        return NextResponse.json({ logs: data || [] });
    } catch (error) {
        console.error('Error fetching food logs:', error);
        return NextResponse.json(
            { error: 'Failed to fetch food logs' },
            { status: 500 }
        );
    }
}

export async function POST(req: NextRequest) {
    const auth = await getUser(req);
    if (isErrorResponse(auth)) return auth;

    try {
        const body = await req.json();
        // user_id in the body is ignored: the row belongs to the caller.
        const { food_id, food_name, meal_type, serving_size, serving_unit, calories, protein_g, carbs_g, fat_g, logged_date, notes } = body;

        if (!food_name || !meal_type) {
            return NextResponse.json(
                { error: 'food_name and meal_type are required' },
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

        const { data: log, error } = await auth.supabase
            .from('food_logs')
            .insert([{
                user_id: auth.user.id,
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
            }])
            .select()
            .single();
        if (error) throw error;

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
    const auth = await getUser(req);
    if (isErrorResponse(auth)) return auth;

    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json(
                { error: 'id is required' },
                { status: 400 }
            );
        }

        const { error } = await auth.supabase
            .from('food_logs')
            .delete()
            .eq('id', id)
            .eq('user_id', auth.user.id);
        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting food log:', error);
        return NextResponse.json(
            { error: 'Failed to delete food log' },
            { status: 500 }
        );
    }
}
