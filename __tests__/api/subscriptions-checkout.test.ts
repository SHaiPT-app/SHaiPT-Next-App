/**
 * @jest-environment node
 */
import { POST } from '@/app/api/subscriptions/checkout/route';
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

function chain(result: { data?: unknown; error?: unknown }) {
    const c: Record<string, unknown> = {};
    for (const m of ['select', 'eq', 'single']) {
        c[m] = jest.fn(() => c);
    }
    c.then = (res: (v: unknown) => unknown, rej?: (e: unknown) => unknown) => Promise.resolve(result).then(res, rej);
    return c;
}

function signedIn() {
    mockGetUser.mockResolvedValue({
        user: { id: 'user-1', email: 'test@test.com' },
        token: 'tok',
        supabase: { from: mockFrom },
    });
}

/** profiles lookup (tester flag) followed by the subscriptions lookup */
function mockProfileThenSubscription(tester: boolean, subscription: unknown) {
    mockFrom
        .mockReturnValueOnce(chain({ data: { tester }, error: null }))
        .mockReturnValueOnce(chain({ data: subscription, error: null }));
}

function checkoutRequest(tier: string) {
    return new Request('http://localhost/api/subscriptions/checkout', {
        method: 'POST',
        headers: { Authorization: 'Bearer valid-token' },
        body: JSON.stringify({ tier }),
    });
}

describe('/api/subscriptions/checkout', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('returns 401 when the token is missing or invalid', async () => {
        mockGetUser.mockResolvedValue(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }));

        const response = await POST(new Request('http://localhost/api/subscriptions/checkout', {
            method: 'POST',
            body: JSON.stringify({ tier: 'starter' }),
        }));
        const data = await response.json();

        expect(response.status).toBe(401);
        expect(data.error).toBe('Unauthorized');
    });

    it('returns 403 for test accounts', async () => {
        signedIn();
        mockFrom.mockReturnValueOnce(chain({ data: { tester: true }, error: null }));

        const response = await POST(checkoutRequest('pro'));
        expect(response.status).toBe(403);
        expect(mockCheckoutCreate).not.toHaveBeenCalled();
    });

    it('returns 400 for invalid tier', async () => {
        signedIn();
        mockFrom.mockReturnValueOnce(chain({ data: { tester: false }, error: null }));

        const response = await POST(checkoutRequest('invalid_tier'));
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toBe('Invalid tier');
    });

    it('creates checkout session for valid tier', async () => {
        signedIn();
        mockProfileThenSubscription(false, { stripe_customer_id: 'cus_123' });
        mockCheckoutCreate.mockResolvedValue({ url: 'https://checkout.stripe.com/session_123' });

        const response = await POST(checkoutRequest('pro'));
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.url).toBe('https://checkout.stripe.com/session_123');
        expect(mockFrom).toHaveBeenNthCalledWith(1, 'profiles');
        expect(mockFrom).toHaveBeenNthCalledWith(2, 'subscriptions');
        expect(mockCheckoutCreate).toHaveBeenCalledWith(
            expect.objectContaining({
                customer: 'cus_123',
                mode: 'subscription',
                line_items: [{ price: 'price_pro_123', quantity: 1 }],
            })
        );
    });

    it('creates new Stripe customer if none exists', async () => {
        signedIn();
        mockProfileThenSubscription(false, null);
        mockCustomerCreate.mockResolvedValue({ id: 'cus_new_456' });
        mockCheckoutCreate.mockResolvedValue({ url: 'https://checkout.stripe.com/session_456' });

        const response = await POST(checkoutRequest('starter'));
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(mockCustomerCreate).toHaveBeenCalledWith({
            email: 'test@test.com',
            metadata: { supabase_user_id: 'user-1' },
        });
        expect(data.url).toBe('https://checkout.stripe.com/session_456');
    });
});
