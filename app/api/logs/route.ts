import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { WorkoutLog } from '@/lib/types';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: Request) {
    try {
        const logData = await request.json();

        const newLog = await db.logs.create({
            ...logData,
            date: new Date().toISOString(),
        });

        return NextResponse.json({ log: newLog }, { status: 201 });
    } catch (error) {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const traineeId = searchParams.get('traineeId');

    if (traineeId) {
        return NextResponse.json({ logs: db.logs.getByTrainee(traineeId) });
    }

    return NextResponse.json({ logs: [] });
}
