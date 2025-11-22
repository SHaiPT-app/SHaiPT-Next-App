import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(request: Request) {
    try {
        const { trainerId, traineeUsername } = await request.json();

        // The original code had a check for missing fields here, which is not present in the provided "Code Edit" snippet.
        // Assuming the "Code Edit" snippet is the desired state for the logic flow.

        const trainee = await db.users.getByUsername(traineeUsername);

        if (!trainee) {
            return NextResponse.json({ error: 'Trainee not found' }, { status: 404 });
        }

        if (trainee.role !== 'trainee') {
            return NextResponse.json({ error: 'User is not a trainee' }, { status: 400 });
        }

        // The original code had a check for trainee.trainerId here, which is not present in the provided "Code Edit" snippet.
        // Assuming the "Code Edit" snippet is the desired state for the logic flow.

        // Update trainee with trainerId
        const updatedTrainee = { ...trainee, trainerId };
        await db.users.update(updatedTrainee);

        return NextResponse.json({ success: true, trainee: updatedTrainee });
    } catch (error) {
        // The original code had a console.error here, which is not present in the provided "Code Edit" snippet.
        // Assuming the "Code Edit" snippet is the desired state for the error handling.
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
}
