import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(request: Request) {
    try {
        const { trainerId, traineeUsername } = await request.json();

        if (!trainerId || !traineeUsername) {
            return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
        }

        const trainee = db.users.getByUsername(traineeUsername);

        if (!trainee) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        if (trainee.role !== 'trainee') {
            return NextResponse.json({ error: 'User is not a trainee' }, { status: 400 });
        }

        if (trainee.trainerId) {
            return NextResponse.json({ error: 'Trainee already assigned to a trainer' }, { status: 409 });
        }

        // Update the trainee
        const updatedTrainee = { ...trainee, trainerId };
        db.users.update(updatedTrainee);

        return NextResponse.json({ success: true, trainee: updatedTrainee });

    } catch (error) {
        console.error('Error linking user:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
