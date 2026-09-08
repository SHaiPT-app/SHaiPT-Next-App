/** @jest-environment node */
import { NextResponse } from 'next/server';
import { getUser } from '@/lib/auth';
import { GET } from '@/app/api/ai-coach/chat/history/route';

jest.mock('@/lib/auth', () => ({
    ...jest.requireActual('@/lib/auth'),
    getUser: jest.fn(),
    getAdmin: jest.fn(),
}));

type Op = { table: string; method: string; args: unknown[] };
function fakeSupabase(rows: unknown, error: { message: string } | null = null) {
    const ops: Op[] = [];
    const from = jest.fn((table: string) => {
        const q: Record<string, jest.Mock> = {};
        for (const m of ['select', 'eq', 'order']) {
            q[m] = jest.fn((...args: unknown[]) => { ops.push({ table, method: m, args }); return q; });
        }
        q.then = jest.fn((res: (v: unknown) => unknown, rej?: (e: unknown) => unknown) =>
            Promise.resolve({ data: error ? null : rows, error }).then(res, rej));
        return q;
    });
    return { from, ops };
}

const mockGetUser = getUser as jest.Mock;
const req = () => new Request('http://localhost/api/ai-coach/chat/history', { headers: { Authorization: 'Bearer tok' } });

describe('GET /api/ai-coach/chat/history', () => {
    beforeEach(() => jest.clearAllMocks());

    it('returns 401 without a user', async () => {
        mockGetUser.mockResolvedValue(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }));
        expect((await GET(req())).status).toBe(401);
    });

    it('returns the caller’s own chats and never a user id from the query', async () => {
        const chats = [{ id: 'chat-1', title: 'Test Chat', messages: [], created_at: 'x', updated_at: 'y' }];
        const supabase = fakeSupabase(chats);
        mockGetUser.mockResolvedValue({ user: { id: 'u1' }, token: 'tok', supabase });

        const res = await GET(new Request('http://localhost/api/ai-coach/chat/history?userId=someone-else', {
            headers: { Authorization: 'Bearer tok' },
        }));
        expect(res.status).toBe(200);
        expect((await res.json()).chats).toEqual(chats);
        expect(supabase.ops).toContainEqual(expect.objectContaining({ table: 'ai_chats', method: 'eq', args: ['user_id', 'u1'] }));
        expect(supabase.ops.some((o) => JSON.stringify(o.args).includes('someone-else'))).toBe(false);
    });

    it('returns an empty list when there are no chats', async () => {
        mockGetUser.mockResolvedValue({ user: { id: 'u1' }, token: 'tok', supabase: fakeSupabase([]) });
        expect((await (await GET(req())).json()).chats).toEqual([]);
    });

    it('returns 500 on a database error', async () => {
        mockGetUser.mockResolvedValue({ user: { id: 'u1' }, token: 'tok', supabase: fakeSupabase(null, { message: 'db down' }) });
        const errSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
        const res = await GET(req());
        expect(res.status).toBe(500);
        expect((await res.json()).error).toBe('Failed to fetch chat history');
        errSpy.mockRestore();
    });
});
