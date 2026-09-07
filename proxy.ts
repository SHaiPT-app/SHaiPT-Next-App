/**
 * Route protection (Next 16 "proxy", formerly middleware).
 *
 * App pages need a signed-in user: without a Supabase session cookie the request is redirected
 * to /login?next=<path>. The session cookie is written by the browser client in lib/supabase.ts
 * (@supabase/ssr). API routes are not touched here: they check the Bearer token themselves
 * through lib/auth.ts.
 */
import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

const PROTECTED_PREFIXES = [
    '/home', '/ai', '/plans', '/workouts', '/nutrition', '/body', '/activity', '/dms', '/profile',
    '/trainer', '/coach', '/dashboard', '/settings', '/onboarding', '/workout', '/feed',
];

function isProtected(pathname: string): boolean {
    return PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export async function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl;
    if (!isProtected(pathname)) return NextResponse.next();

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) return NextResponse.next();

    let response = NextResponse.next({ request });
    const supabase = createServerClient(url, key, {
        cookies: {
            getAll: () => request.cookies.getAll(),
            setAll: (cookies) => {
                for (const { name, value } of cookies) request.cookies.set(name, value);
                response = NextResponse.next({ request });
                for (const { name, value, options } of cookies) response.cookies.set(name, value, options);
            },
        },
    });

    const { data: { user } } = await supabase.auth.getUser();
    if (user) return response;

    const login = request.nextUrl.clone();
    login.pathname = '/login';
    login.search = '';
    login.searchParams.set('next', pathname);
    return NextResponse.redirect(login);
}

export const config = {
    matcher: ['/((?!_next/static|_next/image|favicon.ico|api/|demo|.*\\.(?:png|jpg|jpeg|gif|svg|webp|mp4|webm|ico|txt|xml|woff2?)$).*)'],
};
