/**
 * @jest-environment node
 */
import { POST } from '@/app/api/subscriptions/checkout/route';
import { supabase } from '@/lib/supabase';

// Mock dependencies
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

const mockCheckoutCreate = jest.fn();
const mockCustomerCreate = jest.fn();

jest.mock('@/lib/subscriptions', () => ({
    getStripe: () => ({
        checkout: { sessions: { create: mockCheckoutCreate } },
        customers: { create: mockCustomerCreate },
    }),
    TIER_PRICE_IDS: {
        starter: 'price_starter_123',
        pro: 'price_pro_123',
        elite: 'price_elite_123',
    },
    TRIAL_DAYS: 14,
}));

describe('/api/subscriptions/checkout', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('returns 401 when no auth header provided', async () => {
        const request = new Request('http://localhost/api/subscriptions/checkout', {
            method: 'POST',
            body: JSON.stringify({ tier: 'starter' }),
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(401);
        expect(data.error).toBe('Unauthorized');
    });

    it('returns 401 when auth token is invalid', async () => {
        (supabase.auth.getUser as jest.Mock).mockResolvedValue({
            data: { user: null },
            error: { message: 'Invalid token' },
        });

        const request = new Request('http://localhost/api/subscriptions/checkout', {
            method: 'POST',
            headers: { Authorization: 'Bearer invalid-token' },
            body: JSON.stringify({ tier: 'starter' }),
        });

        const response = await POST(request);
        expect(response.status).toBe(401);
    });

    it('returns 400 for invalid tier', async () => {
        (supabase.auth.getUser as jest.Mock).mockResolvedValue({
            data: { user: { id: 'user-1', email: 'test@test.com' } },
            error: null,
        });

        const request = new Request('http://localhost/api/subscriptions/checkout', {
            method: 'POST',
            headers: { Authorization: 'Bearer valid-token' },
            body: JSON.stringify({ tier: 'invalid_tier' }),
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toBe('Invalid tier');
    });

    it('creates checkout session for valid tier', async () => {
        (supabase.auth.getUser as jest.Mock).mockResolvedValue({
            data: { user: { id: 'user-1', email: 'test@test.com' } },
            error: null,
        });

        const mockFrom = jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                    single: jest.fn().mockResolvedValue({
                        data: { stripe_customer_id: 'cus_123' },
                        error: null,
                    }),
                }),
            }),
        });
        (supabase.from as jest.Mock).mockImplementation(mockFrom);

        mockCheckoutCreate.mockResolvedValue({
            url: 'https://checkout.stripe.com/session_123',
        });

        const request = new Request('http://localhost/api/subscriptions/checkout', {
            method: 'POST',
            headers: { Authorization: 'Bearer valid-token' },
            body: JSON.stringify({ tier: 'pro' }),
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.url).toBe('https://checkout.stripe.com/session_123');
        expect(mockCheckoutCreate).toHaveBeenCalledWith(
            expect.objectContaining({
                customer: 'cus_123',
                mode: 'subscription',
                line_items: [{ price: 'price_pro_123', quantity: 1 }],
            })
        );
    });

    it('creates new Stripe customer if none exists', async () => {
        (supabase.auth.getUser as jest.Mock).mockResolvedValue({
            data: { user: { id: 'user-1', email: 'test@test.com' } },
            error: null,
        });

        const mockFrom = jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                    single: jest.fn().mockResolvedValue({
                        data: null,
                        error: null,
                    }),
                }),
            }),
        });
        (supabase.from as jest.Mock).mockImplementation(mockFrom);

        mockCustomerCreate.mockResolvedValue({ id: 'cus_new_456' });
        mockCheckoutCreate.mockResolvedValue({
            url: 'https://checkout.stripe.com/session_456',
        });

        const request = new Request('http://localhost/api/subscriptions/checkout', {
            method: 'POST',
            headers: { Authorization: 'Bearer valid-token' },
            body: JSON.stringify({ tier: 'starter' }),
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(mockCustomerCreate).toHaveBeenCalledWith({
            email: 'test@test.com',
            metadata: { supabase_user_id: 'user-1' },
        });
        expect(data.url).toBe('https://checkout.stripe.com/session_456');
    });
});
