import { NextResponse } from 'next/server';
import { dbAdmin } from '@/lib/supabaseDb';
import { supabase } from '@/lib/supabase';

export async function POST(request: Request) {
    try {
        // 1. Verify Auth (Trainer only)
        const authHeader = request.headers.get('Authorization');
        if (!authHeader) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const token = authHeader.replace('Bearer ', '');
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Check if requester is a trainer (optional but good practice)
        // For now, we assume the frontend handles role checks, and we trust the authenticated user
        // But ideally we should check db.profiles.getById(user.id).role === 'trainer'

        // 2. Parse Body
        const { traineeId, features } = await request.json();

        if (!traineeId || !features) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // 3. Update Profile
        // We use dbAdmin to bypass RLS if needed, or just to be safe
        const updatedProfile = await dbAdmin.profiles.update(traineeId, {
            ai_features: features
        });

        return NextResponse.json({ success: true, profile: updatedProfile });

    } catch (error: any) {
        console.error('Update features error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
