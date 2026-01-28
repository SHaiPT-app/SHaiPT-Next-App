import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ logId: string }> }
) {
    try {
        const { logId } = await params;
        const body = await request.json();
        const { exerciseLogId, setData } = body;

        if (!exerciseLogId || !setData) {
            return NextResponse.json(
                { error: 'Missing required fields: exerciseLogId, setData' },
                { status: 400 }
            );
        }

        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // Verify exercise log belongs to this workout
        const { data: exerciseLog, error: fetchError } = await supabase
            .from('exercise_logs')
            .select('*')
            .eq('id', exerciseLogId)
            .eq('workout_log_id', logId)
            .single();

        if (fetchError || !exerciseLog) {
            return NextResponse.json(
                { error: 'Exercise log not found' },
                { status: 404 }
            );
        }

        // Append set to exercise log
        const updatedSets = [...(exerciseLog.sets || []), setData];

        const { data: updatedLog, error: updateError } = await supabase
            .from('exercise_logs')
            .update({
                sets: updatedSets,
                total_sets: updatedSets.length,
                total_reps: updatedSets.reduce((sum: number, s: any) => sum + (s.reps || 0), 0),
                max_weight: Math.max(...updatedSets.map((s: any) => s.weight || 0)),
            })
            .eq('id', exerciseLogId)
            .select()
            .single();

        if (updateError) {
            console.error('Failed to update exercise log:', updateError);
            return NextResponse.json(
                { error: 'Failed to log set' },
                { status: 500 }
            );
        }

        return NextResponse.json({ exercise_log: updatedLog });
    } catch (error) {
        console.error('Error logging set:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
