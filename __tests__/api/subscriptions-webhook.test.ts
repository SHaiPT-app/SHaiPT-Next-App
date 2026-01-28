/**
 * @jest-environment node
 */
import { POST } from '@/app/api/subscriptions/webhook/route';

const mockUpsert = jest.fn().mockResolvedValue({ data: null, error: null });
const mockSubscriptionsRetrieve = jest.fn();

jest.mock('@supabase/supabase-js', () => ({
    createClient: jest.fn(() => ({
        from: jest.fn(() => ({
            upsert: mockUpsert,
        })),
    })),
}));

const mockConstructEvent = jest.fn();

jest.mock('@/lib/subscriptions', () => ({
    getStripe: () => ({
        webhooks: { constructEvent: mockConstructEvent },
        subscriptions: { retrieve: mockSubscriptionsRetrieve },
    }),
}));

describe('/api/subscriptions/webhook', () => {
    const originalEnv = process.env;

    beforeEach(() => {
        jest.clearAllMocks();
        process.env = {
            ...originalEnv,
            STRIPE_WEBHOOK_SECRET: 'whsec_test_123',
            NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
            SUPABASE_SERVICE_ROLE_KEY: 'service-role-key',
        };
    });

    afterEach(() => {
        process.env = originalEnv;
    });

    it('returns 400 when missing stripe-signature header', async () => {
        const request = new Request('http://localhost/api/subscriptions/webhook', {
            method: 'POST',
            body: '{}',
        });

        const response = await POST(request);
        expect(response.status).toBe(400);
    });

    it('returns 400 when signature is invalid', async () => {
        mockConstructEvent.mockImplementation(() => {
            throw new Error('Invalid signature');
        });

        const request = new Request('http://localhost/api/subscriptions/webhook', {
            method: 'POST',
            headers: { 'stripe-signature': 'invalid_sig' },
            body: '{}',
        });

        const response = await POST(request);
        expect(response.status).toBe(400);
    });

    it('handles checkout.session.completed event', async () => {
        mockConstructEvent.mockReturnValue({
            type: 'checkout.session.completed',
            data: {
                object: {
                    metadata: { supabase_user_id: 'user-1', tier: 'pro' },
                    customer: 'cus_123',
                    subscription: 'sub_123',
                },
            },
        });

        mockSubscriptionsRetrieve.mockResolvedValue({
            id: 'sub_123',
            status: 'trialing',
            trial_start: Math.floor(Date.now() / 1000),
            trial_end: Math.floor(Date.now() / 1000) + 14 * 86400,
            current_period_start: Math.floor(Date.now() / 1000),
            current_period_end: Math.floor(Date.now() / 1000) + 30 * 86400,
        });

        const request = new Request('http://localhost/api/subscriptions/webhook', {
            method: 'POST',
            headers: { 'stripe-signature': 'valid_sig' },
            body: JSON.stringify({}),
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.received).toBe(true);
        expect(mockUpsert).toHaveBeenCalledWith(
            expect.objectContaining({
                user_id: 'user-1',
                stripe_customer_id: 'cus_123',
                stripe_subscription_id: 'sub_123',
                tier: 'pro',
                status: 'trialing',
            }),
            { onConflict: 'user_id' }
        );
    });

    it('handles customer.subscription.updated event', async () => {
        mockConstructEvent.mockReturnValue({
            type: 'customer.subscription.updated',
            data: {
                object: {
                    id: 'sub_123',
                    status: 'active',
                    metadata: { supabase_user_id: 'user-1', tier: 'pro' },
                    current_period_start: Math.floor(Date.now() / 1000),
                    current_period_end: Math.floor(Date.now() / 1000) + 30 * 86400,
                    cancel_at_period_end: false,
                    trial_start: null,
                    trial_end: null,
                },
            },
        });

        const request = new Request('http://localhost/api/subscriptions/webhook', {
            method: 'POST',
            headers: { 'stripe-signature': 'valid_sig' },
            body: JSON.stringify({}),
        });

        const response = await POST(request);
        expect(response.status).toBe(200);
        expect(mockUpsert).toHaveBeenCalledWith(
            expect.objectContaining({
                user_id: 'user-1',
                status: 'active',
                tier: 'pro',
            }),
            { onConflict: 'user_id' }
        );
    });

    it('handles customer.subscription.deleted event', async () => {
        mockConstructEvent.mockReturnValue({
            type: 'customer.subscription.deleted',
            data: {
                object: {
                    id: 'sub_123',
                    status: 'canceled',
                    metadata: { supabase_user_id: 'user-1', tier: 'starter' },
                    current_period_start: Math.floor(Date.now() / 1000),
                    current_period_end: Math.floor(Date.now() / 1000) + 30 * 86400,
                    cancel_at_period_end: true,
                    trial_start: null,
                    trial_end: null,
                },
            },
        });

        const request = new Request('http://localhost/api/subscriptions/webhook', {
            method: 'POST',
            headers: { 'stripe-signature': 'valid_sig' },
            body: JSON.stringify({}),
        });

        const response = await POST(request);
        expect(response.status).toBe(200);
        expect(mockUpsert).toHaveBeenCalledWith(
            expect.objectContaining({
                status: 'canceled',
                cancel_at_period_end: true,
            }),
            { onConflict: 'user_id' }
        );
    });
});
