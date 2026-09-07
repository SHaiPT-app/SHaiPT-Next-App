/**
 * Legacy workout_plans (trainee_id / trainer_id). The caller must be one of the two: RLS only
 * shows and writes rows where trainee_id or trainer_id is auth.uid(), and POST checks it explicitly.
 */
import { NextResponse } from 'next/server';
import { getUser, isErrorResponse, forbidden } from '@/lib/auth';

interface DbError {
    message?: string;
    code?: string;
    details?: string;
    hint?: string;
    stack?: string;
}

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
    const auth = await getUser(request);
    if (isErrorResponse(auth)) return auth;

    try {
        const planData = await request.json();
        const supabase = auth.supabase;

        if (!planData.name || !planData.trainer_id || !planData.trainee_id) {
            console.error('Missing required fields:', {
                name: !!planData.name,
                trainer_id: !!planData.trainer_id,
                trainee_id: !!planData.trainee_id
            });
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Validate UUID format
        if (!uuidRegex.test(planData.trainer_id)) {
            console.error('Invalid trainer_id UUID format:', planData.trainer_id);
            return NextResponse.json({ error: `Invalid trainer ID format: ${planData.trainer_id}` }, { status: 400 });
        }
        if (!uuidRegex.test(planData.trainee_id)) {
            console.error('Invalid trainee_id UUID format:', planData.trainee_id);
            return NextResponse.json({ error: `Invalid trainee ID format: ${planData.trainee_id}` }, { status: 400 });
        }

        if (planData.trainer_id !== auth.user.id && planData.trainee_id !== auth.user.id) {
            return forbidden('You must be the trainer or the trainee of this plan');
        }

        // Ensure sessions is a valid JSONB array
        const sessions = Array.isArray(planData.sessions) ? planData.sessions : [];

        // Clean the payload - remove undefined values that might cause issues
        const cleanPayload = {
            trainee_id: planData.trainee_id,
            trainer_id: planData.trainer_id,
            name: planData.name,
            description: planData.description || '',
            exercises: sessions,
            assigned_at: planData.assigned_at,
            expires_at: planData.expires_at
        };

        // Remove any undefined values from the payload
        const planPayload = Object.fromEntries(
            Object.entries(cleanPayload).filter(([, value]) => value !== undefined)
        );

        // Check that trainer and trainee exist (profiles are readable by every signed-in user)
        const { data: trainer } = await supabase
            .from('profiles')
            .select('id')
            .eq('id', planData.trainer_id)
            .maybeSingle();
        if (!trainer) {
            console.error('Trainer not found:', planData.trainer_id);
            return NextResponse.json({ error: `Trainer not found: ${planData.trainer_id}` }, { status: 400 });
        }

        const { data: trainee } = await supabase
            .from('profiles')
            .select('id')
            .eq('id', planData.trainee_id)
            .maybeSingle();
        if (!trainee) {
            console.error('Trainee not found:', planData.trainee_id);
            return NextResponse.json({ error: `Trainee not found: ${planData.trainee_id}` }, { status: 400 });
        }

        const { data, error } = await supabase
            .from('workout_plans')
            .insert([planPayload])
            .select()
            .single();

        if (error) {
            console.error('Plan insert error:', {
                message: error.message,
                details: error.details,
                hint: error.hint,
                code: error.code
            });
            throw error;
        }

        return NextResponse.json({ plan: data }, { status: 201 });
    } catch (caught: unknown) {
        const error = caught as DbError;
        console.error('Plan creation error details:', {
            message: error.message,
            code: error.code,
            details: error.details,
            hint: error.hint,
            stack: error.stack
        });
        return NextResponse.json({
            error: error.message || 'Internal server error',
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        }, { status: 500 });
    }
}

export async function PUT(request: Request) {
    const auth = await getUser(request);
    if (isErrorResponse(auth)) return auth;

    try {
        const planData = await request.json();

        if (!planData.id) {
            return NextResponse.json({ error: 'Missing plan ID' }, { status: 400 });
        }

        const updatePayload: Record<string, unknown> = {};
        if (planData.name !== undefined) updatePayload.name = planData.name;
        if (planData.description !== undefined) updatePayload.description = planData.description;
        if (planData.sessions !== undefined) updatePayload.exercises = planData.sessions;
        if (planData.is_active !== undefined) updatePayload.is_active = planData.is_active;
        if (planData.assigned_at !== undefined) updatePayload.assigned_at = planData.assigned_at;
        if (planData.expires_at !== undefined) updatePayload.expires_at = planData.expires_at;

        // RLS: only a plan whose trainer or trainee is the caller is updated
        const { data, error } = await auth.supabase
            .from('workout_plans')
            .update(updatePayload)
            .eq('id', planData.id)
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({ plan: data });
    } catch (caught: unknown) {
        const error = caught as DbError;
        console.error('Plan update error:', error);
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
    }
}

export async function GET(request: Request) {
    const auth = await getUser(request);
    if (isErrorResponse(auth)) return auth;

    try {
        const { searchParams } = new URL(request.url);
        const trainerId = searchParams.get('trainerId');
        const traineeId = searchParams.get('traineeId');
        const supabase = auth.supabase;

        // Every branch runs under RLS, so only plans where the caller is the trainer or the
        // trainee come back whatever ids the query names.
        let plans = [];
        if (trainerId) {
            const { data, error } = await supabase
                .from('workout_plans')
                .select('*')
                .eq('trainer_id', trainerId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            plans = data || [];
        } else if (traineeId) {
            const { data, error } = await supabase
                .from('workout_plans')
                .select('*')
                .eq('trainee_id', traineeId)
                .eq('is_active', true)
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Trainee plans query error:', error);
                throw error;
            }

            plans = data || [];
        } else {
            const { data, error } = await supabase
                .from('workout_plans')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            plans = data || [];
        }

        return NextResponse.json({ plans });
    } catch (caught: unknown) {
        const error = caught as DbError;
        console.error('Get plans error:', error);
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
    }
}
