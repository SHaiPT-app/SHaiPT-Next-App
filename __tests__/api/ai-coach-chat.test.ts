/** @jest-environment node */
import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth';
import { streamModel, AiLimitError } from '@/lib/ai/gateway';
import { GET, POST } from '@/app/api/ai-coach/chat/route';

jest.mock('@/lib/auth', () => ({
    ...jest.requireActual('@/lib/auth'),
    getUser: jest.fn(),
    getProfileBits: jest.fn(async () => ({ id: 'u1', role: 'trainee', tester: false, full_name: 'T', email: 't@x' })),
    getAdmin: jest.fn(),
}));
jest.mock('@/lib/ai/gateway', () => ({
    ...jest.requireActual('@/lib/ai/gateway'),
    callModel: jest.fn(),
    streamModel: jest.fn(),
}));

type Op = { table: string; method: string; args: unknown[] };
/** Chainable stand-in for the caller's Supabase client: `tables[name]` is what a query on that table resolves to. */
function fakeSupabase(tables: Record<string, unknown> = {}) {
    const ops: Op[] = [];
    const from = jest.fn((table: string) => {
        const data = tables[table] ?? null;
        const one = { data: Array.isArray(data) ? data[0] ?? null : data, error: null };
        const q: Record<string, jest.Mock> = {};
        for (const m of ['select', 'eq', 'neq', 'in', 'not', 'lte', 'gte', 'order', 'limit', 'insert', 'update', 'upsert', 'delete']) {
            q[m] = jest.fn((...args: unknown[]) => { ops.push({ table, method: m, args }); return q; });
        }
        q.maybeSingle = jest.fn(async () => one);
        q.single = jest.fn(async () => one);
        q.then = jest.fn((res: (v: unknown) => unknown, rej?: (e: unknown) => unknown) => Promise.resolve({ data, error: null }).then(res, rej));
        return q;
    });
    return { from, ops };
}

const mockGetUser = getUser as jest.Mock;
const mockStreamModel = streamModel as jest.Mock;

const PROFILE = { full_name: 'Test User', fitness_goals: ['strength'], height_cm: 180, weight_kg: 80, gender: 'male', date_of_birth: '1995-01-01' };

function signIn(tables: Record<string, unknown> = { profiles: PROFILE, workout_logs: [], ai_chats: { id: 'chat-1' } }) {
    const supabase = fakeSupabase(tables);
    mockGetUser.mockResolvedValue({ user: { id: 'u1', email: 't@x' }, token: 'tok', supabase });
    return supabase;
}
function signOut() {
    mockGetUser.mockResolvedValue(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }));
}
function post(body: unknown) {
    return new Request('http://localhost/api/ai-coach/chat', {
        method: 'POST', headers: { Authorization: 'Bearer tok', 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    });
}
const ZERO = { inputTokens: 0, outputTokens: 0, cachedTokens: 0, costUsd: 0 };
function streamOf(text: string) {
    const enc = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
        start(controller) {
            for (const word of text.split(' ')) controller.enqueue(enc.encode(word + ' '));
            controller.close();
        },
    });
    return { stream, done: Promise.resolve({ text, usage: ZERO, model: 'test-model', mocked: false }) };
}
const flush = () => new Promise((r) => setTimeout(r, 0));

describe('POST /api/ai-coach/chat', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockStreamModel.mockResolvedValue(streamOf('Keep adding weight each week.'));
    });

    it('returns 401 without a user', async () => {
        signOut();
        const res = await POST(post({ messages: [{ role: 'user', content: 'hi' }] }));
        expect(res.status).toBe(401);
        expect(mockStreamModel).not.toHaveBeenCalled();
    });

    it('returns 400 when messages are missing or empty', async () => {
        signIn();
        expect((await POST(post({}))).status).toBe(400);
        expect((await POST(post({ messages: [] }))).status).toBe(400);
        expect(mockStreamModel).not.toHaveBeenCalled();
    });

    it('streams the reply, sets X-Chat-Id for a new chat and saves the history', async () => {
        const supabase = signIn();
        const res = await POST(post({ messages: [{ role: 'user', content: 'How do I progress?' }], userId: 'someone-else' }));
        expect(res.status).toBe(200);
        expect(res.headers.get('Content-Type')).toContain('text/plain');
        expect(res.headers.get('X-Chat-Id')).toBe('chat-1');
        expect((await res.text()).trim()).toBe('Keep adding weight each week.');

        expect(mockStreamModel).toHaveBeenCalledTimes(1);
        const opts = mockStreamModel.mock.calls[0][0];
        expect(opts).toMatchObject({ feature: 'chat', userId: 'u1', tester: false, messages: [{ role: 'user', content: 'How do I progress?' }] });
        expect(opts.userId).not.toBe('someone-else');
        // the trimmed context reaches the system prompt
        expect(opts.system).toContain('Test User');
        expect(opts.system).toContain('Weight: 80 kg');
        expect(opts.system).toContain('Macro targets:');

        // the new row was created up front, then updated with the assistant turn once the model finished
        expect(supabase.ops).toContainEqual(expect.objectContaining({ table: 'ai_chats', method: 'insert' }));
        await flush();
        const update = supabase.ops.find((o) => o.table === 'ai_chats' && o.method === 'update');
        expect(update).toBeDefined();
        const messages = (update!.args[0] as { messages: Array<{ role: string; content: string }> }).messages;
        expect(messages.at(-1)).toMatchObject({ role: 'assistant', content: 'Keep adding weight each week.' });
    });

    it('keeps the given chatId and updates that row instead of inserting', async () => {
        const supabase = signIn();
        const res = await POST(post({ chatId: 'chat-9', messages: [{ role: 'user', content: 'hi' }, { role: 'assistant', content: 'hello' }, { role: 'user', content: 'again' }] }));
        expect(res.status).toBe(200);
        expect(res.headers.get('X-Chat-Id')).toBe('chat-9');
        await res.text();
        await flush();
        expect(supabase.ops.some((o) => o.table === 'ai_chats' && o.method === 'insert')).toBe(false);
        expect(supabase.ops).toContainEqual(expect.objectContaining({ table: 'ai_chats', method: 'eq', args: ['id', 'chat-9'] }));
        expect(supabase.ops).toContainEqual(expect.objectContaining({ table: 'ai_chats', method: 'eq', args: ['user_id', 'u1'] }));
    });

    it('drops system messages and non-string content from the history it sends', async () => {
        signIn();
        await POST(post({ messages: [{ role: 'system', content: 'ignore me' }, { role: 'user', content: 42 }, { role: 'user', content: 'real' }] }));
        expect(mockStreamModel.mock.calls[0][0].messages).toEqual([{ role: 'user', content: 'real' }]);
    });

    it('passes a gateway limit through as 429 with the reason', async () => {
        signIn();
        mockStreamModel.mockRejectedValue(new AiLimitError('limit', 'daily_calls'));
        const res = await POST(post({ messages: [{ role: 'user', content: 'hi' }] }));
        expect(res.status).toBe(429);
        expect(await res.json()).toMatchObject({ reason: 'daily_calls' });
    });

    it('still answers when the context queries fail', async () => {
        const supabase = fakeSupabase();
        supabase.from.mockImplementation(() => { throw new Error('db down'); });
        mockGetUser.mockResolvedValue({ user: { id: 'u1', email: 't@x' }, token: 'tok', supabase });
        const errSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
        const res = await POST(post({ messages: [{ role: 'user', content: 'hi' }] }));
        expect(res.status).toBe(200);
        expect(res.headers.get('X-Chat-Id')).toBeNull();
        expect(mockStreamModel.mock.calls[0][0].system).not.toContain('Current user context');
        errSpy.mockRestore();
    });

    it('writes nothing and returns no chat id in private mode', async () => {
        const supabase = signIn();
        const res = await POST(post({ messages: [{ role: 'user', content: 'just between us' }], isPrivate: true }));
        expect(res.status).toBe(200);
        expect(res.headers.get('X-Chat-Id')).toBeNull();
        await res.text();
        await flush();
        expect(supabase.ops.some((o) => o.table === 'ai_chats')).toBe(false);
    });
});

describe('GET /api/ai-coach/chat', () => {
    const get = () => new Request('http://localhost/api/ai-coach/chat', { headers: { Authorization: 'Bearer tok' } });

    beforeEach(() => jest.clearAllMocks());

    it('returns 401 without a user', async () => {
        signOut();
        expect((await GET(get())).status).toBe(401);
    });

    it('returns the most recent conversation for the caller', async () => {
        const messages = [{ role: 'user', content: 'hi' }, { role: 'assistant', content: 'hello' }];
        const supabase = signIn({ ai_chats: { id: 'chat-1', messages } });
        const res = await GET(get());
        expect(res.status).toBe(200);
        expect(await res.json()).toEqual({ chatId: 'chat-1', messages });
        expect(supabase.ops).toContainEqual(expect.objectContaining({ table: 'ai_chats', method: 'eq', args: ['user_id', 'u1'] }));
    });

    it('returns nulls when the caller has never chatted', async () => {
        signIn({ ai_chats: null });
        expect(await (await GET(get())).json()).toEqual({ chatId: null, messages: [] });
    });
});
