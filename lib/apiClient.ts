/**
 * fetch() for the app's own API routes from the browser: attaches the Supabase access token as
 * `Authorization: Bearer …` (every route under app/api derives the caller from it) and turns a
 * non-2xx reply into an ApiError with the server's message, so pages can show it.
 *
 *   const { plan } = await apiFetch<{ plan: Plan }>('/api/plans/generate', { method: 'POST', body: { … } });
 *
 * 401 → the session is gone: the caller is sent to /login.
 * 429 → the AI limit message from the gateway ("You've used today's 40 AI messages…").
 */
import { supabase } from '@/lib/supabase';

export class ApiError extends Error {
    constructor(public status: number, message: string, public body?: unknown) {
        super(message);
        this.name = 'ApiError';
    }
}

export async function accessToken(): Promise<string | null> {
    try {
        const { data: { session } } = await supabase.auth.getSession();
        return session?.access_token ?? null;
    } catch {
        return null;
    }
}

export async function authHeaders(extra: Record<string, string> = {}): Promise<Record<string, string>> {
    const token = await accessToken();
    return token ? { ...extra, Authorization: `Bearer ${token}` } : extra;
}

interface ApiInit extends Omit<RequestInit, 'body' | 'headers'> {
    body?: unknown;
    headers?: Record<string, string>;
    /** return the raw Response (streams, headers) instead of parsed JSON */
    raw?: boolean;
}

/** JSON in, JSON out, token attached. Throws ApiError on non-2xx. */
export async function apiFetch<T = unknown>(url: string, init: ApiInit = {}): Promise<T> {
    const res = await apiFetchRaw(url, init);
    if (res.status === 204) return undefined as T;
    const text = await res.text();
    try {
        return (text ? JSON.parse(text) : undefined) as T;
    } catch {
        throw new ApiError(res.status, 'The server returned something that was not JSON.', text);
    }
}

/** Same, but the Response is yours (for streamed replies and response headers). */
export async function apiFetchRaw(url: string, init: ApiInit = {}): Promise<Response> {
    const { body, headers = {}, raw: _raw, ...rest } = init;
    const isForm = typeof FormData !== 'undefined' && body instanceof FormData;
    const finalHeaders = await authHeaders(isForm || body === undefined ? headers : { 'Content-Type': 'application/json', ...headers });
    const res = await fetch(url, {
        ...rest,
        headers: finalHeaders,
        body: body === undefined ? undefined : isForm ? (body as FormData) : typeof body === 'string' ? body : JSON.stringify(body),
    });
    if (!res.ok) {
        let message = `Request failed (${res.status})`;
        let parsed: unknown;
        try {
            parsed = await res.clone().json();
            const m = (parsed as { error?: string; message?: string })?.error ?? (parsed as { message?: string })?.message;
            if (m) message = m;
        } catch {
            // not JSON
        }
        if (res.status === 401 && typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
            window.location.href = `/login?next=${encodeURIComponent(window.location.pathname)}`;
        }
        throw new ApiError(res.status, message, parsed);
    }
    return res;
}

/** Human message for a failed call, for toasts and ErrorState. */
export function errorMessage(err: unknown, fallback = 'Something went wrong. Tell Ali what you were doing.'): string {
    if (err instanceof ApiError) return err.message;
    if (err instanceof Error && err.message) return err.message;
    return fallback;
}
