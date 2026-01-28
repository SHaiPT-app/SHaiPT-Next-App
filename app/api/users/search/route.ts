import { NextResponse } from 'next/server';
import { db } from '@/lib/supabaseDb';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const query = searchParams.get('q');
        const role = searchParams.get('role') || 'trainee';

        if (!query || query.length < 1) {
            return NextResponse.json({ users: [] });
        }

        // Get all profiles and filter
        const allProfiles = await db.profiles.getAll();
        
        // Filter for trainees without a trainer that match the search query
        const availableTrainees = allProfiles.filter(profile => 
            profile.role === role &&
            !profile.trainer_id && // No trainer assigned yet
            (profile.username || '').toLowerCase().includes(query.toLowerCase())
        );

        // Return only first 10 results
        const results = availableTrainees.slice(0, 10);

        return NextResponse.json({ users: results });
    } catch (error: any) {
        console.error('Search trainees error:', error);
        return NextResponse.json({ 
            error: error.message || 'Internal server error' 
        }, { status: 500 });
    }
}