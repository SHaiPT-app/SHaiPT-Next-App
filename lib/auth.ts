/**
 * One place for "who is calling this API route".
 *
 *   const auth = await getUser(request);
 *   if (isErrorResponse(auth)) return auth;           // 401 JSON
 *   auth.user.id                                       // the caller, from the verified token
 *   auth.supabase                                      // client acting as the caller (RLS applies)
 *   getAdmin()                                         // service role, bypasses RLS: only for
 *                                                      // writes on behalf of others and for the
 *                                                      // AI gateway bookkeeping
 *
 * API routes take the session as `Authorization: Bearer <access token>` (the browser gets it from
 * supabase.auth.getSession()). Never trust a user id from the query string or the body: derive
 * everything from `auth.user.id`.
 */
import { NextResponse } from 'next/server';
import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';

export interface AuthContext {
    user: User;
    token: string;
    /** Supabase client authenticated as the caller; every query runs under RLS. */
    supabase: SupabaseClient;
}

// createClient itself throws a clear error when a value is missing
function env(name: string): string {
    return process.env[name] ?? '';
}

export function bearerToken(request: Request): string | null {
    const header = request.headers.get('Authorization') ?? request.headers.get('authorization');
    if (!header) return null;
    const m = /^Bearer\s+(.+)$/i.exec(header.trim());
    return m ? m[1] : null;
}

/** Anon-key client acting as the holder of `token`. */
export function userClient(token: string): SupabaseClient {
    return createClient(env('NEXT_PUBLIC_SUPABASE_URL'), env('NEXT_PUBLIC_SUPABASE_ANON_KEY'), {
        global: { headers: { Authorization: `Bearer ${token}` } },
        auth: { autoRefreshToken: false, persistSession: false },
    });
}

let admin: SupabaseClient | null = null;
/** Service-role client (server only). Bypasses RLS: use it deliberately. */
export function getAdmin(): SupabaseClient {
    if (typeof window !== 'undefined') throw new Error('getAdmin() is server-only');
    if (!admin) {
        admin = createClient(env('NEXT_PUBLIC_SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), {
            auth: { autoRefreshToken: false, persistSession: false },
        });
    }
    return admin;
}

export function unauthorized(message = 'Unauthorized'): NextResponse {
    return NextResponse.json({ error: message }, { status: 401 });
}

export function forbidden(message = 'Forbidden'): NextResponse {
    return NextResponse.json({ error: message }, { status: 403 });
}

/** The caller, or a 401 response. */
export async function getUser(request: Request): Promise<AuthContext | NextResponse> {
    const token = bearerToken(request);
    if (!token) return unauthorized();
    const supabase = userClient(token);
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data.user) return unauthorized();
    return { user: data.user, token, supabase };
}

export function isErrorResponse<T>(result: T | NextResponse): result is NextResponse {
    return result instanceof NextResponse;
}

export interface ProfileBits {
    id: string;
    role: 'trainee' | 'trainer';
    tester: boolean;
    full_name: string | null;
    email: string;
}

/** The caller's profile row (role, tester flag). */
export async function getProfileBits(ctx: AuthContext): Promise<ProfileBits> {
    const { data } = await ctx.supabase
        .from('profiles')
        .select('id, role, tester, full_name, email')
        .eq('id', ctx.user.id)
        .maybeSingle();
    return {
        id: ctx.user.id,
        role: data?.role === 'trainer' ? 'trainer' : 'trainee',
        tester: data?.tester === true,
        full_name: data?.full_name ?? null,
        email: data?.email ?? ctx.user.email ?? '',
    };
}

/** The caller, who must be a trainer; else 401/403. */
export async function requireTrainer(request: Request): Promise<(AuthContext & { profile: ProfileBits }) | NextResponse> {
    const auth = await getUser(request);
    if (isErrorResponse(auth)) return auth;
    const profile = await getProfileBits(auth);
    if (profile.role !== 'trainer') return forbidden('Trainer account required');
    return { ...auth, profile };
}

/** Is `coachId` the active coach of `athleteId`? (service role; used before a coach-side write) */
export async function isActiveCoachOf(coachId: string, athleteId: string): Promise<boolean> {
    const { data } = await getAdmin()
        .from('coaching_relationships')
        .select('id')
        .eq('coach_id', coachId)
        .eq('athlete_id', athleteId)
        .eq('status', 'active')
        .maybeSingle();
    return !!data;
}
