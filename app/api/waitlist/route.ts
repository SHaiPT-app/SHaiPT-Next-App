/**
 * POST /api/waitlist { email, company?, utm?, referrer?, landingPath? } → { ok, already }
 *
 * The one public write on the marketing surface, and the thing paid traffic converts into while
 * sign-up stays invite-only. Uses the service role because `waitlist` is service-only under RLS
 * (migration 0150): the anon key must not be able to read the list, and must not be able to learn
 * whether a given address is on it.
 *
 * Two deliberate choices:
 *
 *   `company` is a honeypot. The form renders it off-screen with autocomplete off, so a person
 *   never types in it and anything that arrives in it is a bot. The route answers 200 anyway —
 *   telling a scraper it was caught only teaches it to try again without the field.
 *
 *   A repeat submission is a success, not an error. The visitor typed their own address; "you are
 *   already on the list" is the true and useful answer, and a red box here costs a signup.
 */
import { NextResponse } from 'next/server';
import { getAdmin } from '@/lib/auth';

/** Long enough for real addresses, short enough that nobody posts a novel. */
const MAX_EMAIL = 254;
const MAX_FIELD = 200;

/**
 * Best-effort per-IP throttle. Fluid Compute reuses instances, so this catches the ordinary case
 * of one machine hammering the form; it is not a distributed limiter and is not trying to be. The
 * unique index on email is what actually bounds the damage.
 */
const HITS = new Map<string, number[]>();
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 5;

function rateLimited(ip: string): boolean {
    const now = Date.now();
    const recent = (HITS.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
    recent.push(now);
    HITS.set(ip, recent);
    // Keep the map from growing without bound on a long-lived instance.
    if (HITS.size > 5_000) {
        for (const [key, times] of HITS) {
            if (times.every((t) => now - t >= WINDOW_MS)) HITS.delete(key);
        }
    }
    return recent.length > MAX_PER_WINDOW;
}

/**
 * Deliberately not RFC 5322. This rejects the typos and the obvious junk; the only real proof an
 * address exists is mail arriving at it.
 */
function normalizeEmail(raw: unknown): string | null {
    if (typeof raw !== 'string') return null;
    const email = raw.trim().toLowerCase();
    if (email.length < 5 || email.length > MAX_EMAIL) return null;
    if (!/^[^\s@,;:<>()[\]\\"]+@[^\s@.]+(\.[^\s@.]+)+$/.test(email)) return null;
    return email;
}

function clamp(raw: unknown): string | null {
    if (typeof raw !== 'string') return null;
    const value = raw.trim().slice(0, MAX_FIELD);
    return value || null;
}

export async function POST(request: Request) {
    const ip =
        request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
        request.headers.get('x-real-ip') ||
        'unknown';
    if (rateLimited(ip)) {
        return NextResponse.json({ error: 'Too many attempts. Try again in a minute.' }, { status: 429 });
    }

    let body: Record<string, unknown>;
    try {
        body = (await request.json()) as Record<string, unknown>;
    } catch {
        return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    // Honeypot: answer exactly as a success would, and write nothing.
    if (clamp(body.company)) return NextResponse.json({ ok: true, already: false });

    const email = normalizeEmail(body.email);
    if (!email) return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 400 });

    const utm = (body.utm ?? {}) as Record<string, unknown>;
    const row = {
        email,
        utm_source: clamp(utm.utm_source),
        utm_medium: clamp(utm.utm_medium),
        utm_campaign: clamp(utm.utm_campaign),
        utm_content: clamp(utm.utm_content),
        utm_term: clamp(utm.utm_term),
        referrer: clamp(body.referrer),
        landing_path: clamp(body.landingPath),
    };

    try {
        // ignoreDuplicates keeps the first touch: the campaign that actually won the signup is the
        // one that brought them the first time, not whichever ad they clicked on a second visit.
        const { data, error } = await getAdmin()
            .from('waitlist')
            .upsert(row, { onConflict: 'email', ignoreDuplicates: true })
            .select('id');

        if (error) throw error;
        // Nothing came back → the row already existed and the upsert ignored it.
        return NextResponse.json({ ok: true, already: (data?.length ?? 0) === 0 });
    } catch {
        return NextResponse.json({ error: 'Could not save that. Try again in a moment.' }, { status: 500 });
    }
}
