/**
 * Jest manual mock for lib/apiClient: same surface, but the token is a constant and the calls go
 * through global.fetch so tests can keep mocking fetch and asserting on the URL, method, headers
 * and body. Responses only need `ok` and `json()` (or `text()`); status defaults to 200/500.
 * Enable with jest.mock('@/lib/apiClient').
 */
export const TEST_TOKEN = 'test-token';

export class ApiError extends Error {
    constructor(public status: number, message: string, public body?: unknown) {
        super(message);
        this.name = 'ApiError';
    }
}

export async function accessToken(): Promise<string | null> {
    return TEST_TOKEN;
}

export async function authHeaders(extra: Record<string, string> = {}): Promise<Record<string, string>> {
    return { ...extra, Authorization: `Bearer ${TEST_TOKEN}` };
}

interface ApiInit extends Omit<RequestInit, 'body' | 'headers'> {
    body?: unknown;
    headers?: Record<string, string>;
    raw?: boolean;
}

interface LooseResponse {
    ok?: boolean;
    status?: number;
    json?: () => Promise<unknown>;
    text?: () => Promise<string>;
    clone?: () => LooseResponse;
    headers?: { get(name: string): string | null };
    body?: unknown;
}

async function readBody(res: LooseResponse): Promise<unknown> {
    if (typeof res.text === 'function') {
        const text = await res.text();
        return text ? JSON.parse(text) : undefined;
    }
    if (typeof res.json === 'function') return res.json();
    return undefined;
}

export async function apiFetchRaw(url: string, init: ApiInit = {}): Promise<Response> {
    const { body, headers = {}, raw: _raw, ...rest } = init;
    const isForm = typeof FormData !== 'undefined' && body instanceof FormData;
    const finalHeaders = await authHeaders(isForm || body === undefined ? headers : { 'Content-Type': 'application/json', ...headers });
    const options: Record<string, unknown> = { ...rest, headers: finalHeaders };
    if (body !== undefined) options.body = isForm ? body : typeof body === 'string' ? body : JSON.stringify(body);
    const res = (await fetch(url, options)) as unknown as LooseResponse;
    const ok = res.ok !== undefined ? res.ok : (res.status ?? 200) < 400;
    if (!ok) {
        const status = res.status ?? 500;
        let message = `Request failed (${status})`;
        let parsed: unknown;
        try {
            parsed = await readBody(typeof res.clone === 'function' ? res.clone() : res);
            const m = (parsed as { error?: string; message?: string })?.error ?? (parsed as { message?: string })?.message;
            if (m) message = m;
        } catch {
            // not JSON
        }
        throw new ApiError(status, message, parsed);
    }
    return res as unknown as Response;
}

export async function apiFetch<T = unknown>(url: string, init: ApiInit = {}): Promise<T> {
    const res = (await apiFetchRaw(url, init)) as unknown as LooseResponse;
    if (res.status === 204) return undefined as T;
    return (await readBody(res)) as T;
}

export function errorMessage(err: unknown, fallback = 'Something went wrong. Tell Ali what you were doing.'): string {
    if (err instanceof ApiError) return err.message;
    if (err instanceof Error && err.message) return err.message;
    return fallback;
}
