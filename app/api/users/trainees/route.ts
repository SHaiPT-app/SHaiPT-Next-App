import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const trainerId = searchParams.get('trainerId');

        const users = db.users.getAll();
        let trainees = users.filter(u => u.role === 'trainee');

        if (trainerId) {
            trainees = trainees.filter(u => u.trainerId === trainerId);
        }

        // Remove passwords
        const safeTrainees = trainees.map(({ password, ...u }) => u);
        return NextResponse.json({ trainees: safeTrainees });
    } catch (error) {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
