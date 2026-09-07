/**
 * POST /api/invites/check { email } → { allowed: boolean }
 *
 * Sign-up is invite-only: an email is allowed when it has an unused `invites` row or appears in
 * ALLOW_SIGNUP_EMAILS (comma-separated). Uses the service role because invites are not readable
 * with the anon key. Rate-limited by shape: it answers only allowed/not, never lists anything.
 */
import { NextResponse } from 'next/server';
import { getAdmin } from '@/lib/auth';

export async function isSignupAllowed(email: string): Promise<boolean> {
    const normalized = email.trim().toLowerCase();
    if (!normalized || !normalized.includes('@')) return false;

    const allowList = (process.env.ALLOW_SIGNUP_EMAILS ?? '')
        .split(',')
        .map((e) => e.trim().toLowerCase())
        .filter(Boolean);
    if (allowList.includes(normalized)) return true;

    try {
        const { data } = await getAdmin()
            .from('invites')
            .select('id')
            .eq('email', normalized)
            .is('used_at', null)
            .maybeSingle();
        return !!data;
    } catch {
        return false;
    }
}

export async function POST(request: Request) {
    let email = '';
    try {
        const body = await request.json();
        email = typeof body?.email === 'string' ? body.email : '';
    } catch {
        return NextResponse.json({ error: 'email required' }, { status: 400 });
    }
    if (!email) return NextResponse.json({ error: 'email required' }, { status: 400 });
    return NextResponse.json({ allowed: await isSignupAllowed(email) });
}
