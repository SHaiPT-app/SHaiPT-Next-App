/**
 * @jest-environment node
 */
import { requireFeatureAccess, isErrorResponse } from '@/lib/requireSubscription';
import { NextResponse } from 'next/server';

const mockGetUser = jest.fn();
const mockFrom = jest.fn();

jest.mock('@supabase/supabase-js', () => ({
    createClient: jest.fn(() => ({
        auth: { getUser: mockGetUser },
        from: mockFrom,
    })),
}));

jest.mock('@/lib/subscriptions', () => ({
    hasFeatureAccess: jest.fn((sub, feature) => {
        if (!sub) return false;
        if (sub.status !== 'active' && sub.status !== 'trialing') return false;
        const features: Record<string, Record<string, boolean>> = {
            starter: { workout_planner: true },
            pro: { workout_planner: true, dietitian: true },
            elite: { workout_planner: true, dietitian: true, coach_dashboard: true },
        };
        return features[sub.tier]?.[feature] ?? false;
    }),
    getRequiredTier: jest.fn((feature) => {
        if (feature === 'workout_planner') return 'starter';
        if (feature === 'dietitian') return 'pro';
        return 'elite';
    }),
}));

describe('requireFeatureAccess', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('returns 401 when no auth header', async () => {
        const request = new Request('http://localhost/test');
        const result = await requireFeatureAccess(request, 'workout_planner');

        expect(isErrorResponse(result)).toBe(true);
        expect((result as NextResponse).status).toBe(401);
    });

    it('returns 401 when token is invalid', async () => {
        mockGetUser.mockResolvedValue({
            data: { user: null },
            error: { message: 'Invalid' },
        });

        const request = new Request('http://localhost/test', {
            headers: { Authorization: 'Bearer bad-token' },
        });

        const result = await requireFeatureAccess(request, 'workout_planner');
        expect(isErrorResponse(result)).toBe(true);
        expect((result as NextResponse).status).toBe(401);
    });

    it('returns 403 when user has no subscription', async () => {
        mockGetUser.mockResolvedValue({
            data: { user: { id: 'user-1' } },
            error: null,
        });

        mockFrom.mockReturnValue({
            select: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                    single: jest.fn().mockResolvedValue({
                        data: null,
                        error: null,
                    }),
                }),
            }),
        });

        const request = new Request('http://localhost/test', {
            headers: { Authorization: 'Bearer valid-token' },
        });

        const result = await requireFeatureAccess(request, 'workout_planner');
        expect(isErrorResponse(result)).toBe(true);
        const response = result as NextResponse;
        expect(response.status).toBe(403);
        const body = await response.json();
        expect(body.error).toBe('Subscription required');
    });

    it('returns 403 when tier does not include the feature', async () => {
        mockGetUser.mockResolvedValue({
            data: { user: { id: 'user-1' } },
            error: null,
        });

        mockFrom.mockReturnValue({
            select: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                    single: jest.fn().mockResolvedValue({
                        data: {
                            id: 'sub-1',
                            user_id: 'user-1',
                            tier: 'starter',
                            status: 'active',
                        },
                        error: null,
                    }),
                }),
            }),
        });

        const request = new Request('http://localhost/test', {
            headers: { Authorization: 'Bearer valid-token' },
        });

        const result = await requireFeatureAccess(request, 'dietitian');
        expect(isErrorResponse(result)).toBe(true);
        const response = result as NextResponse;
        expect(response.status).toBe(403);
        const body = await response.json();
        expect(body.required_tier).toBe('pro');
        expect(body.current_tier).toBe('starter');
    });

    it('returns userId and subscription when access is granted', async () => {
        mockGetUser.mockResolvedValue({
            data: { user: { id: 'user-1' } },
            error: null,
        });

        const mockSub = {
            id: 'sub-1',
            user_id: 'user-1',
            tier: 'pro',
            status: 'active',
        };

        mockFrom.mockReturnValue({
            select: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                    single: jest.fn().mockResolvedValue({
                        data: mockSub,
                        error: null,
                    }),
                }),
            }),
        });

        const request = new Request('http://localhost/test', {
            headers: { Authorization: 'Bearer valid-token' },
        });

        const result = await requireFeatureAccess(request, 'dietitian');
        expect(isErrorResponse(result)).toBe(false);
        expect(result).toEqual({
            userId: 'user-1',
            subscription: mockSub,
        });
    });
});

describe('isErrorResponse', () => {
    it('returns true for NextResponse', () => {
        const response = NextResponse.json({ error: 'test' });
        expect(isErrorResponse(response)).toBe(true);
    });

    it('returns false for AuthResult', () => {
        const result = {
            userId: 'user-1',
            subscription: {
                id: 'sub-1',
                user_id: 'user-1',
                tier: 'starter' as const,
                status: 'active' as const,
            },
        };
        expect(isErrorResponse(result)).toBe(false);
    });
});
