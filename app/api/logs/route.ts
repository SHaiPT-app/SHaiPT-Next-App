import { NextResponse } from 'next/server';
import { db } from '@/lib/supabaseDb';
import { createClient } from '@supabase/supabase-js';
import { WorkoutLog } from '@/lib/types';

export async function POST(request: Request) {
    try {
        const logData = await request.json();
        console.log('Creating workout log with data:', JSON.stringify(logData, null, 2));

        // Create authenticated Supabase client for this request
        const authHeader = request.headers.get('Authorization');
        console.log('Logs POST Auth header:', authHeader ? 'Present' : 'Missing');
        
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

        // Prepare log data for database
        const logPayload = {
            plan_id: logData.plan_id,
            trainee_id: logData.trainee_id,
            date: new Date().toISOString().split('T')[0], // Just the date part
            exercises: logData.exercises,
            completed_at: new Date().toISOString()
        };

        console.log('Inserting log with payload:', JSON.stringify(logPayload, null, 2));

        const { data, error } = await supabase
            .from('workout_logs')
            .insert([logPayload])
            .select()
            .single();

        if (error) {
            console.error('Workout log creation error:', {
                message: error.message,
                details: error.details,
                hint: error.hint,
                code: error.code
            });
            throw error;
        }

        console.log('Workout log created successfully:', data);
        return NextResponse.json({ log: data }, { status: 201 });
    } catch (error: any) {
        console.error('POST logs error:', error);
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
    }
}

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const traineeId = searchParams.get('traineeId');

        // Create authenticated Supabase client for this request
        const authHeader = request.headers.get('Authorization');
        console.log('Logs GET Auth header:', authHeader ? 'Present' : 'Missing');
        
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

        if (traineeId) {
            const { data, error } = await supabase
                .from('workout_logs')
                .select('*')
                .eq('trainee_id', traineeId)
                .order('date', { ascending: false });
            
            if (error) {
                console.error('Logs fetch error:', error);
                throw error;
            }
            
            console.log(`Found ${data?.length || 0} logs for trainee`);
            return NextResponse.json({ logs: data || [] });
        }

        return NextResponse.json({ logs: [] });
    } catch (error: any) {
        console.error('Get logs error:', error);
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
    }
}
