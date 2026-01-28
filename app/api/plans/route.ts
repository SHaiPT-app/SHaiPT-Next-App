import { NextResponse } from 'next/server';
import { dbAdmin } from '@/lib/supabaseDb';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
    try {
        const planData = await request.json();
        console.log('Creating plan with data:', JSON.stringify(planData, null, 2));

        // Create authenticated Supabase client for this request
        const authHeader = request.headers.get('Authorization');
        console.log('Auth header:', authHeader ? 'Present' : 'Missing');

        // Create a Supabase client with the user's session
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                global: {
                    headers: {
                        Authorization: authHeader || ''
                    }
                }
            }
        );

        // Enhanced validation 
        console.log('Received IDs:', {
            trainer_id: planData.trainer_id,
            trainee_id: planData.trainee_id,
            trainer_id_type: typeof planData.trainer_id,
            trainee_id_type: typeof planData.trainee_id
        });

        if (!planData.name || !planData.trainer_id || !planData.trainee_id) {
            console.error('Missing required fields:', {
                name: !!planData.name,
                trainer_id: !!planData.trainer_id,
                trainee_id: !!planData.trainee_id
            });
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Validate UUID format
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(planData.trainer_id)) {
            console.error('Invalid trainer_id UUID format:', planData.trainer_id);
            return NextResponse.json({ error: `Invalid trainer ID format: ${planData.trainer_id}` }, { status: 400 });
        }
        if (!uuidRegex.test(planData.trainee_id)) {
            console.error('Invalid trainee_id UUID format:', planData.trainee_id);
            return NextResponse.json({ error: `Invalid trainee ID format: ${planData.trainee_id}` }, { status: 400 });
        }

        console.log('Attempting to create plan with validated data...');
        console.log('Proceeding with plan creation...');

        // Log sessions data structure
        console.log('Sessions data:', JSON.stringify(planData.sessions, null, 2));

        // Ensure sessions is a valid JSONB array
        const sessions = Array.isArray(planData.sessions) ? planData.sessions : [];
        console.log('Processed sessions:', sessions);

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
            Object.entries(cleanPayload).filter(([_, value]) => value !== undefined)
        );

        console.log('Final plan payload:', JSON.stringify(planPayload, null, 2));

        // Check if trainer and trainee exist in profiles table
        console.log('Validating trainer and trainee exist...');

        const trainer = await dbAdmin.profiles.getById(planData.trainer_id);
        if (!trainer) {
            console.error('Trainer not found:', planData.trainer_id);
            return NextResponse.json({ error: `Trainer not found: ${planData.trainer_id}` }, { status: 400 });
        }
        console.log('Trainer found:', trainer.username);

        const trainee = await dbAdmin.profiles.getById(planData.trainee_id);
        if (!trainee) {
            console.error('Trainee not found:', planData.trainee_id);
            return NextResponse.json({ error: `Trainee not found: ${planData.trainee_id}` }, { status: 400 });
        }
        console.log('Trainee found:', trainee.username);

        // Use the authenticated Supabase client directly
        console.log('Creating plan with authenticated client...');
        const { data, error } = await supabase
            .from('workout_plans')
            .insert([planPayload])
            .select()
            .single();

        if (error) {
            console.error('Authenticated Supabase insert error:', {
                message: error.message,
                details: error.details,
                hint: error.hint,
                code: error.code
            });
            throw error;
        }

        const newPlan = data;

        console.log('Plan created successfully:', newPlan);
        return NextResponse.json({ plan: newPlan }, { status: 201 });
    } catch (error: any) {
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
    try {
        const planData = await request.json();
        console.log('Updating plan with data:', planData);

        if (!planData.id) {
            return NextResponse.json({ error: 'Missing plan ID' }, { status: 400 });
        }

        const authHeader = request.headers.get('Authorization');
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                global: {
                    headers: {
                        Authorization: authHeader || ''
                    }
                }
            }
        );

        const updatePayload: Record<string, unknown> = {};
        if (planData.name !== undefined) updatePayload.name = planData.name;
        if (planData.description !== undefined) updatePayload.description = planData.description;
        if (planData.sessions !== undefined) updatePayload.exercises = planData.sessions;
        if (planData.is_active !== undefined) updatePayload.is_active = planData.is_active;
        if (planData.assigned_at !== undefined) updatePayload.assigned_at = planData.assigned_at;
        if (planData.expires_at !== undefined) updatePayload.expires_at = planData.expires_at;

        const { data, error } = await supabase
            .from('workout_plans')
            .update(updatePayload)
            .eq('id', planData.id)
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({ plan: data });
    } catch (error: any) {
        console.error('Plan update error:', error);
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
    }
}

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const trainerId = searchParams.get('trainerId');
        const traineeId = searchParams.get('traineeId');

        console.log('Getting plans with params:', { trainerId, traineeId });



        // Create authenticated Supabase client for this request
        const authHeader = request.headers.get('Authorization');
        console.log('GET Auth header:', authHeader ? 'Present' : 'Missing');

        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                global: {
                    headers: {
                        Authorization: authHeader || ''
                    }
                }
            }
        );

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
            console.log(`Searching for plans with trainee_id = ${traineeId}`);

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
            console.log(`Query result: Found ${plans.length} plans for trainee ${traineeId}`);

            if (plans.length > 0) {
                console.log('Plans found:', plans.map(p => ({
                    id: p.id,
                    name: p.name,
                    trainee_id: p.trainee_id,
                    trainer_id: p.trainer_id,
                    is_active: p.is_active
                })));
            } else {
                // Let's also check if there are ANY plans for this trainee (including inactive ones)
                const { data: allPlans } = await supabase
                    .from('workout_plans')
                    .select('*')
                    .eq('trainee_id', traineeId);

                console.log(`Total plans for trainee ${traineeId} (including inactive): ${allPlans?.length || 0}`);
                if (allPlans && allPlans.length > 0) {
                    console.log('All plans (including inactive):', allPlans.map(p => ({
                        id: p.id,
                        name: p.name,
                        is_active: p.is_active
                    })));
                }
            }
        } else {
            const { data, error } = await supabase
                .from('workout_plans')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            plans = data || [];
        }

        console.log(`Found ${plans.length} plans`);
        return NextResponse.json({ plans });
    } catch (error: any) {
        console.error('Get plans error:', error);
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
    }
}
