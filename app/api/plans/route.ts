import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { WorkoutPlan } from '@/lib/types';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: Request) {
    try {
        const planData = await request.json();

        const newPlan: WorkoutPlan = {
            id: uuidv4(),
            ...planData,
            createdAt: new Date().toISOString(),
        };

        db.plans.create(newPlan);
        return NextResponse.json({ plan: newPlan });
    } catch (error) {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function PUT(request: Request) {
    try {
        const planData = await request.json();

        if (!planData.id) {
            return NextResponse.json({ error: 'Missing plan ID' }, { status: 400 });
        }

        // In a real app, we'd fetch first to ensure it exists and preserve createdAt if not sent
        // For this mock DB, we'll assume the client sends the full object or we merge it.
        // But let's just update it.
        db.plans.update(planData);

        return NextResponse.json({ plan: planData });
    } catch (error) {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const trainerId = searchParams.get('trainerId');
    const traineeId = searchParams.get('traineeId');

    if (trainerId) {
        return NextResponse.json({ plans: db.plans.getByTrainer(trainerId) });
    }
    if (traineeId) {
        return NextResponse.json({ plans: db.plans.getByTrainee(traineeId) });
    }

    return NextResponse.json({ plans: [] });
}
