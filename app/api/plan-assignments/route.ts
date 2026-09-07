import { NextRequest, NextResponse } from 'next/server';
import { getUser, isErrorResponse } from '@/lib/auth';

/**
 * POST: the caller (a coach) assigns a plan to a client. The relationship check runs as the
 * caller and the insert does too: RLS requires assigned_by_id = caller and an active coaching
 * relationship, and the SECURITY DEFINER trigger notifies the client.
 */
export async function POST(request: NextRequest) {
    try {
        const auth = await getUser(request);
        if (isErrorResponse(auth)) return auth;
        const assignedById = auth.user.id;

        const body = await request.json();
        const { plan_id, user_id, start_date, end_date } = body;

        if (!plan_id || !user_id || !start_date || !end_date) {
            return NextResponse.json(
                { error: 'plan_id, user_id, start_date, and end_date are required' },
                { status: 400 }
            );
        }

        // Verify the caller has an active coaching relationship with the user that allows plans
        const { data: relationship, error: relError } = await auth.supabase
            .from('coaching_relationships')
            .select('id, can_assign_plans')
            .eq('coach_id', assignedById)
            .eq('athlete_id', user_id)
            .eq('status', 'active')
            .maybeSingle();
        if (relError) throw relError;

        if (!relationship || !relationship.can_assign_plans) {
            return NextResponse.json(
                { error: 'You do not have permission to assign plans to this user' },
                { status: 403 }
            );
        }

        // Verify the plan exists (and is visible to the caller)
        const { data: plan, error: planError } = await auth.supabase
            .from('training_plans')
            .select('id')
            .eq('id', plan_id)
            .maybeSingle();
        if (planError) throw planError;
        if (!plan) {
            return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
        }

        const { data: assignment, error: insertError } = await auth.supabase
            .from('training_plan_assignments')
            .insert([{
                plan_id,
                user_id,
                assigned_by_id: assignedById,
                is_self_assigned: false,
                start_date,
                end_date,
                is_active: true,
            }])
            .select()
            .single();
        if (insertError) throw insertError;

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

/** GET: the caller's own plan assignments, each with its plan. */
export async function GET(request: NextRequest) {
    try {
        const auth = await getUser(request);
        if (isErrorResponse(auth)) return auth;

        const { data: assignments, error } = await auth.supabase
            .from('training_plan_assignments')
            .select('*')
            .eq('user_id', auth.user.id)
            .order('start_date', { ascending: false });
        if (error) throw error;

        // Enrich assignments with plan details
        const enrichedAssignments = await Promise.all(
            (assignments || []).map(async (assignment) => {
                try {
                    const { data: plan, error: planError } = await auth.supabase
                        .from('training_plans')
                        .select('*')
                        .eq('id', assignment.plan_id)
                        .maybeSingle();
                    if (planError) throw planError;
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
