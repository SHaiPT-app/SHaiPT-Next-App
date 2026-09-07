/**
 * Helpers for API route unit tests (Node environment).
 *
 *   jest.mock('@/lib/auth', () => authMockFactory());
 *   jest.mock('@/lib/ai/gateway', () => gatewayMockFactory());
 *   const supabase = signIn({ profiles: {...}, workout_logs: [] });   // caller is u1
 *   signOut();                                                          // 401
 *   const res = await POST(post('/api/x', { ... }));
 */
import { NextResponse } from 'next/server';

export const USER = { id: 'u1', email: 'tester@example.com' };
export const ZERO_USAGE = { inputTokens: 0, outputTokens: 0, cachedTokens: 0, costUsd: 0 };

export type Op = { table: string; method: string; args: unknown[] };

/** Chainable stand-in for a Supabase client. `tables[name]` is what any query on that table resolves to. */
export function fakeSupabase(tables: Record<string, unknown> = {}) {
    const ops: Op[] = [];
    const from = jest.fn((table: string) => {
        const data = tables[table] ?? null;
        const one = { data: Array.isArray(data) ? data[0] ?? null : data, error: null };
        const q: Record<string, jest.Mock> = {};
        for (const m of ['select', 'eq', 'neq', 'in', 'is', 'not', 'lt', 'lte', 'gt', 'gte', 'ilike', 'or', 'order', 'limit', 'range', 'insert', 'update', 'upsert', 'delete']) {
            q[m] = jest.fn((...args: unknown[]) => { ops.push({ table, method: m, args }); return q; });
        }
        q.maybeSingle = jest.fn(async () => one);
        q.single = jest.fn(async () => one);
        q.then = jest.fn((res: (v: unknown) => unknown, rej?: (e: unknown) => unknown) =>
            Promise.resolve({ data, error: null, count: Array.isArray(data) ? data.length : data ? 1 : 0 }).then(res, rej));
        return q;
    });
    const rpc = jest.fn(async () => ({ data: [{ calls: 0, tokens: 0 }], error: null }));
    return { from, rpc, ops, auth: { getUser: jest.fn(async () => ({ data: { user: USER }, error: null })) } };
}

export type FakeSupabase = ReturnType<typeof fakeSupabase>;

/** Factory for jest.mock('@/lib/auth'). getUser/getProfileBits/getAdmin are jest.fn and can be re-programmed per test. */
export function authMockFactory() {
    const actual = jest.requireActual('@/lib/auth');
    return {
        ...actual,
        getUser: jest.fn(),
        getProfileBits: jest.fn(async () => ({ id: USER.id, role: 'trainee', tester: false, full_name: 'Tester', email: USER.email })),
        requireTrainer: jest.fn(),
        getAdmin: jest.fn(() => fakeSupabase()),
        isActiveCoachOf: jest.fn(async () => false),
    };
}

/** Factory for jest.mock('@/lib/ai/gateway'): callModel/streamModel are jest.fn; everything else real. */
export function gatewayMockFactory() {
    const actual = jest.requireActual('@/lib/ai/gateway');
    return { ...actual, callModel: jest.fn(), streamModel: jest.fn(), checkLimits: jest.fn() };
}

function authModule() {
    // resolved lazily so the test file's jest.mock has taken effect
    return jest.requireMock('@/lib/auth') as { getUser: jest.Mock; getProfileBits: jest.Mock; requireTrainer: jest.Mock };
}

/** The caller is USER with this fake database. Returns the fake so tests can inspect `ops`. */
export function signIn(tables: Record<string, unknown> = {}, opts: { tester?: boolean; role?: 'trainee' | 'trainer' } = {}): FakeSupabase {
    const supabase = fakeSupabase(tables);
    const ctx = { user: USER, token: 'tok', supabase };
    const auth = authModule();
    auth.getUser.mockResolvedValue(ctx);
    auth.getProfileBits.mockResolvedValue({ id: USER.id, role: opts.role ?? 'trainee', tester: opts.tester ?? false, full_name: 'Tester', email: USER.email });
    if (opts.role === 'trainer') auth.requireTrainer.mockResolvedValue({ ...ctx, profile: { id: USER.id, role: 'trainer', tester: false, full_name: 'Tester', email: USER.email } });
    else auth.requireTrainer.mockResolvedValue(NextResponse.json({ error: 'Trainer account required' }, { status: 403 }));
    return supabase;
}

export function signOut(): void {
    const auth = authModule();
    const res = () => NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    auth.getUser.mockImplementation(async () => res());
    auth.requireTrainer.mockImplementation(async () => res());
}

export function post(url: string, body?: unknown, headers: Record<string, string> = {}): Request {
    return new Request(`http://localhost${url}`, {
        method: 'POST',
        headers: { Authorization: 'Bearer tok', 'Content-Type': 'application/json', ...headers },
        body: body === undefined ? undefined : JSON.stringify(body),
    });
}

export function get(url: string, headers: Record<string, string> = {}): Request {
    return new Request(`http://localhost${url}`, { method: 'GET', headers: { Authorization: 'Bearer tok', ...headers } });
}

/** A callModel result carrying `json` (and its text form). */
export function modelJson<T>(json: T, extra: Partial<{ cached: boolean; mocked: boolean; model: string }> = {}) {
    return { text: JSON.stringify(json), json, usage: ZERO_USAGE, model: 'test-model', cached: false, mocked: false, ...extra };
}

/** A callModel result carrying plain text. */
export function modelText(text: string, extra: Partial<{ cached: boolean; mocked: boolean; model: string }> = {}) {
    return { text, json: undefined, usage: ZERO_USAGE, model: 'test-model', cached: false, mocked: false, ...extra };
}

/** A streamModel result that streams `text` word by word. */
export function modelStream(text: string) {
    const enc = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
        start(controller) {
            for (const word of text.split(' ')) controller.enqueue(enc.encode(word + ' '));
            controller.close();
        },
    });
    return { stream, done: Promise.resolve({ text, usage: ZERO_USAGE, model: 'test-model', mocked: false }) };
}

export async function readStream(res: Response): Promise<string> {
    const reader = res.body!.getReader();
    const dec = new TextDecoder();
    let out = '';
    for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        out += dec.decode(value);
    }
    return out;
}
