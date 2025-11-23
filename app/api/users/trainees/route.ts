import { NextResponse } from 'next/server';
import { db } from '@/lib/supabaseDb';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const trainerId = searchParams.get('trainerId');

        if (trainerId) {
            // Get trainees for this specific trainer
            const trainees = await db.profiles.getTrainees(trainerId);
            return NextResponse.json({ trainees });
        } else {
            // Get all trainees (if needed for admin purposes)
            const allProfiles = await db.profiles.getAll();
            const trainees = allProfiles.filter(u => u.role === 'trainee');
            return NextResponse.json({ trainees });
        }
    } catch (error: any) {
        console.error('Get trainees error:', error);
        return NextResponse.json({ 
            error: error.message || 'Internal server error' 
        }, { status: 500 });
    }
}
