/**
 * @jest-environment node
 */
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/supabaseDb';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { plan_id, user_id, assigned_by_id, start_date, end_date } = body;

        if (!plan_id || !user_id || !assigned_by_id || !start_date || !end_date) {
            return NextResponse.json(
                { error: 'plan_id, user_id, assigned_by_id, start_date, and end_date are required' },
                { status: 400 }
            );
        }

        // Verify the assigner has an active coaching relationship with the user
        const relationships = await db.coachingRelationships.getAsCoach(assigned_by_id);
        const hasRelationship = relationships.some(
            (r) => r.athlete_id === user_id && r.can_assign_plans
        );

        if (!hasRelationship) {
            return NextResponse.json(
                { error: 'You do not have permission to assign plans to this user' },
                { status: 403 }
            );
        }

        // Verify the plan exists
        const plan = await db.trainingPlans.getById(plan_id);
        if (!plan) {
            return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
        }

        const assignment = await db.trainingPlanAssignments.create({
            plan_id,
            user_id,
            assigned_by_id,
            is_self_assigned: false,
            start_date,
            end_date,
            is_active: true,
        });

        return NextResponse.json({ assignment }, { status: 201 });
    } catch (error: unknown) {
        console.error('Plan assignment error:', error);
        const message = error instanceof Error ? error.message : 'Internal server error';
        return NextResponse.json(
            { error: message },
            { status: 500 }
        );
    }
}

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('userId');

        if (!userId) {
            return NextResponse.json({ error: 'userId is required' }, { status: 400 });
        }

        const assignments = await db.trainingPlanAssignments.getByUser(userId);

        // Enrich assignments with plan details
        const enrichedAssignments = await Promise.all(
            assignments.map(async (assignment) => {
                try {
                    const plan = await db.trainingPlans.getById(assignment.plan_id);
                    return { ...assignment, plan };
                } catch {
                    return { ...assignment, plan: null };
                }
            })
        );

        return NextResponse.json({ assignments: enrichedAssignments });
    } catch (error: unknown) {
        console.error('Get plan assignments error:', error);
        const message = error instanceof Error ? error.message : 'Internal server error';
        return NextResponse.json(
            { error: message },
            { status: 500 }
        );
    }
}
