/**
 * @jest-environment node
 */
import { GET } from '@/app/api/nutrition/route';
import { NextRequest, NextResponse } from 'next/server';

const mockGetUser = jest.fn();
const mockFrom = jest.fn();

jest.mock('@/lib/auth', () => {
    const { NextResponse: NR } = jest.requireActual('next/server');
    return {
        getUser: (...args: unknown[]) => mockGetUser(...args),
        isErrorResponse: (r: unknown) => r instanceof NR,
        getAdmin: jest.fn(),
        userClient: jest.fn(),
        bearerToken: jest.fn(),
    };
});

function chain(result: { data?: unknown; error?: unknown }) {
    const c: Record<string, unknown> = {};
    for (const m of ['select', 'eq', 'order', 'limit', 'maybeSingle']) {
        c[m] = jest.fn(() => c);
    }
    c.then = (res: (v: unknown) => unknown, rej?: (e: unknown) => unknown) => Promise.resolve(result).then(res, rej);
    return c;
}

const USER = 'user-1';
function signedIn() {
    mockGetUser.mockResolvedValue({ user: { id: USER }, token: 'tok', supabase: { from: mockFrom } });
}

describe('/api/nutrition GET', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('returns 401 without a token', async () => {
        mockGetUser.mockResolvedValue(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }));
        const res = await GET(new NextRequest('http://localhost/api/nutrition?userId=user-1'));
        expect(res.status).toBe(401);
    });

    it('returns null plan when no plan exists', async () => {
        signedIn();
        const q = chain({ data: null, error: null });
        mockFrom.mockReturnValue(q);

        const res = await GET(new NextRequest('http://localhost/api/nutrition?userId=someone-else'));
        const data = await res.json();

        expect(res.status).toBe(200);
        expect(data.plan).toBeNull();
        expect(mockFrom).toHaveBeenCalledWith('nutrition_plans');
        expect(q.eq).toHaveBeenCalledWith('user_id', USER);
    });

    it("returns the caller's latest plan", async () => {
        signedIn();
        const mockPlan = { id: 'plan-1', user_id: USER, name: '7-Day Meal Plan', dietary_preferences: ['vegan'] };
        mockFrom.mockReturnValue(chain({ data: mockPlan, error: null }));

        const res = await GET(new NextRequest('http://localhost/api/nutrition'));
        const data = await res.json();

        expect(res.status).toBe(200);
        expect(data.plan.id).toBe('plan-1');
        expect(data.plan.name).toBe('7-Day Meal Plan');
    });

    it('returns 500 on database error', async () => {
        signedIn();
        mockFrom.mockReturnValue(chain({ data: null, error: { message: 'DB error' } }));

        const res = await GET(new NextRequest('http://localhost/api/nutrition'));
        const data = await res.json();

        expect(res.status).toBe(500);
        expect(data.error).toBe('Failed to fetch nutrition plan');
    });
});
