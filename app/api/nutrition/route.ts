import { NextRequest, NextResponse } from 'next/server';
import { getUser, isErrorResponse } from '@/lib/auth';

// `userId` in the query is ignored: the plan is always the caller's latest.
export async function GET(req: NextRequest) {
    const auth = await getUser(req);
    if (isErrorResponse(auth)) return auth;

    try {
        const { data: plan, error } = await auth.supabase
            .from('nutrition_plans')
            .select('*')
            .eq('user_id', auth.user.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
        if (error) throw error;

        return NextResponse.json({ plan: plan || null });
    } catch (error) {
        console.error('Error fetching nutrition plan:', error);
        return NextResponse.json(
            { error: 'Failed to fetch nutrition plan' },
            { status: 500 }
        );
    }
}
