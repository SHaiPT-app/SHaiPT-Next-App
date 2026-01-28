import { NextResponse } from 'next/server';
import { dbAdmin } from '@/lib/supabaseDb';
import { supabase } from '@/lib/supabase';

export async function POST(request: Request) {
    try {
        // 1. Verify Auth
        const authHeader = request.headers.get('Authorization');
        if (!authHeader) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const token = authHeader.replace('Bearer ', '');
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // 2. Parse Body
        let { trainerId, traineeId, traineeUsername, action } = await request.json();

        if (!trainerId || (!traineeId && !traineeUsername) || !action) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Lookup traineeId if only username is provided
        if (!traineeId && traineeUsername) {
            const trainee = await dbAdmin.profiles.getByUsername(traineeUsername);
            if (!trainee) {
                return NextResponse.json({ error: `User with username "${traineeUsername}" not found` }, { status: 404 });
            }
            traineeId = trainee.id;
        }

        // 3. Verify Permissions
        // Only the trainer themselves or the trainee themselves can initiate a link
        // But for this specific route (Trainer adding Trainee), we expect the requester to be the Trainer.
        // Or if Trainee is selecting Trainer, they are the requester.

        // Let's check who is making the request
        if (user.id !== trainerId && user.id !== traineeId) {
            return NextResponse.json({ error: 'Forbidden: You can only modify your own connections' }, { status: 403 });
        }

        // 4. Perform Action using Admin Client (bypasses RLS)
        if (action === 'link') {
            // Set trainee's trainer_id to trainerId
            await dbAdmin.profiles.update(traineeId, { trainer_id: trainerId });
        } else if (action === 'unlink') {
            // Set trainee's trainer_id to null
            // We must pass null explicitly, but our update type might expect Partial<Profile>
            // Let's check if we can pass null. The interface says string | undefined.
            // We might need to cast or update the interface if strict null checks are on.
            // For now, let's try passing null as any to bypass TS if needed, or just null.
            await dbAdmin.profiles.update(traineeId, { trainer_id: null });
        } else {
            return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
        }

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error('Link error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
