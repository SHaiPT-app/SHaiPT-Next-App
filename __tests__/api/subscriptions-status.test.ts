/**
 * @jest-environment node
 */
import { GET } from '@/app/api/subscriptions/status/route';
import { NextResponse } from 'next/server';

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
    for (const m of ['select', 'eq', 'single']) {
        c[m] = jest.fn(() => c);
    }
    c.then = (res: (v: unknown) => unknown, rej?: (e: unknown) => unknown) => Promise.resolve(result).then(res, rej);
    return c;
}

function signedIn() {
    mockGetUser.mockResolvedValue({ user: { id: 'user-1' }, token: 'tok', supabase: { from: mockFrom } });
}

describe('/api/subscriptions/status', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('returns 401 when the token is missing or invalid', async () => {
        mockGetUser.mockResolvedValue(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }));
        const response = await GET(new Request('http://localhost/api/subscriptions/status'));
        expect(response.status).toBe(401);
    });

    it('returns null subscription when user has none', async () => {
        signedIn();
        mockFrom.mockReturnValue(chain({ data: null, error: { code: 'PGRST116' } }));

        const response = await GET(new Request('http://localhost/api/subscriptions/status', {
            headers: { Authorization: 'Bearer valid-token' },
        }));
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.subscription).toBeNull();
    });

    it('returns active subscription', async () => {
        signedIn();
        const q = chain({ data: { id: 'sub-1', user_id: 'user-1', tier: 'pro', status: 'active' }, error: null });
        mockFrom.mockReturnValue(q);

        const response = await GET(new Request('http://localhost/api/subscriptions/status', {
            headers: { Authorization: 'Bearer valid-token' },
        }));
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.subscription.tier).toBe('pro');
        expect(data.subscription.status).toBe('active');
        expect(mockFrom).toHaveBeenCalledWith('subscriptions');
        expect(q.eq).toHaveBeenCalledWith('user_id', 'user-1');
    });

    it('marks expired trial as incomplete', async () => {
        signedIn();
        const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        mockFrom.mockReturnValue(chain({
            data: { id: 'sub-1', user_id: 'user-1', tier: 'starter', status: 'trialing', trial_end: pastDate },
            error: null,
        }));

        const response = await GET(new Request('http://localhost/api/subscriptions/status', {
            headers: { Authorization: 'Bearer valid-token' },
        }));
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.subscription.status).toBe('incomplete');
    });
});
