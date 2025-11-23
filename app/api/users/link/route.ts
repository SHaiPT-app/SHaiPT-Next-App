import { NextResponse } from 'next/server';
import { db } from '@/lib/supabaseDb';

export async function POST(request: Request) {
    try {
        const { trainerId, traineeUsername } = await request.json();

        if (!trainerId || !traineeUsername) {
            return NextResponse.json({ error: 'Missing trainerId or traineeUsername' }, { status: 400 });
        }

        // Find trainee by username
        const trainee = await db.profiles.getByUsername(traineeUsername);

        if (!trainee) {
            return NextResponse.json({ error: 'Trainee not found' }, { status: 404 });
        }

        if (trainee.role !== 'trainee') {
            return NextResponse.json({ error: 'User is not a trainee' }, { status: 400 });
        }

        if (trainee.trainer_id) {
            return NextResponse.json({ error: 'Trainee already has a trainer' }, { status: 400 });
        }

        // Update trainee with trainer_id
        const updatedTrainee = await db.profiles.update(trainee.id, { 
            trainer_id: trainerId 
        });

        return NextResponse.json({ success: true, trainee: updatedTrainee });
    } catch (error: any) {
        console.error('Link trainee error:', error);
        return NextResponse.json({ 
            error: error.message || 'Internal server error' 
        }, { status: 500 });
    }
}
