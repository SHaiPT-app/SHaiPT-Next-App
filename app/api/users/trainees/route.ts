import { NextResponse } from 'next/server';
import { db } from '@/lib/supabaseDb';
import { supabase } from '@/lib/supabase';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status'); // 'available' or undefined
        const trainerId = searchParams.get('trainerId');

        // 1. Verify Auth (Optional but recommended for user lists)
        const authHeader = request.headers.get('Authorization');
        if (!authHeader) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // 2. Fetch Data
        let query = supabase
            .from('profiles')
            .select('*')
            .eq('role', 'trainee');

        if (status === 'available') {
            // Fetch trainees with NO trainer
            query = query.is('trainer_id', null);
        } else if (trainerId) {
            // Fetch trainees for specific trainer
            query = query.eq('trainer_id', trainerId);
        }

        const { data, error } = await query;

        if (error) throw error;

        return NextResponse.json(data);

    } catch (error: any) {
        console.error('Fetch trainees error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
