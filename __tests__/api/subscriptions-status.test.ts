/**
 * @jest-environment node
 */
import { GET } from '@/app/api/subscriptions/status/route';
import { supabase } from '@/lib/supabase';

jest.mock('@supabase/supabase-js', () => ({
    createClient: jest.fn(),
}));

jest.mock('@/lib/supabase', () => ({
    supabase: {
        auth: {
            getUser: jest.fn(),
        },
        from: jest.fn(),
    },
}));

describe('/api/subscriptions/status', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('returns 401 when no auth header provided', async () => {
        const request = new Request('http://localhost/api/subscriptions/status');
        const response = await GET(request);
        expect(response.status).toBe(401);
    });

    it('returns 401 when auth token is invalid', async () => {
        (supabase.auth.getUser as jest.Mock).mockResolvedValue({
            data: { user: null },
            error: { message: 'Invalid' },
        });

        const request = new Request('http://localhost/api/subscriptions/status', {
            headers: { Authorization: 'Bearer bad-token' },
        });

        const response = await GET(request);
        expect(response.status).toBe(401);
    });

    it('returns null subscription when user has none', async () => {
        (supabase.auth.getUser as jest.Mock).mockResolvedValue({
            data: { user: { id: 'user-1' } },
            error: null,
        });

        (supabase.from as jest.Mock).mockReturnValue({
            select: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                    single: jest.fn().mockResolvedValue({
                        data: null,
                        error: { code: 'PGRST116' },
                    }),
                }),
            }),
        });

        const request = new Request('http://localhost/api/subscriptions/status', {
            headers: { Authorization: 'Bearer valid-token' },
        });

        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.subscription).toBeNull();
    });

    it('returns active subscription', async () => {
        (supabase.auth.getUser as jest.Mock).mockResolvedValue({
            data: { user: { id: 'user-1' } },
            error: null,
        });

        const mockSub = {
            id: 'sub-1',
            user_id: 'user-1',
            tier: 'pro',
            status: 'active',
        };

        (supabase.from as jest.Mock).mockReturnValue({
            select: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                    single: jest.fn().mockResolvedValue({
                        data: mockSub,
                        error: null,
                    }),
                }),
            }),
        });

        const request = new Request('http://localhost/api/subscriptions/status', {
            headers: { Authorization: 'Bearer valid-token' },
        });

        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.subscription.tier).toBe('pro');
        expect(data.subscription.status).toBe('active');
    });

    it('marks expired trial as incomplete', async () => {
        (supabase.auth.getUser as jest.Mock).mockResolvedValue({
            data: { user: { id: 'user-1' } },
            error: null,
        });

        const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const mockSub = {
            id: 'sub-1',
            user_id: 'user-1',
            tier: 'starter',
            status: 'trialing',
            trial_end: pastDate,
        };

        (supabase.from as jest.Mock).mockReturnValue({
            select: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                    single: jest.fn().mockResolvedValue({
                        data: mockSub,
                        error: null,
                    }),
                }),
            }),
        });

        const request = new Request('http://localhost/api/subscriptions/status', {
            headers: { Authorization: 'Bearer valid-token' },
        });

        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.subscription.status).toBe('incomplete');
    });
});
