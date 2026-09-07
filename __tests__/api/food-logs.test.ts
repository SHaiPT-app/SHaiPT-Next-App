/**
 * @jest-environment node
 */
import { GET, POST, DELETE } from '@/app/api/food-logs/route';
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
    for (const m of ['select', 'insert', 'delete', 'eq', 'gte', 'lte', 'order', 'single']) {
        c[m] = jest.fn(() => c);
    }
    c.then = (res: (v: unknown) => unknown, rej?: (e: unknown) => unknown) => Promise.resolve(result).then(res, rej);
    return c;
}

const USER = 'user-1';
function signedIn() {
    mockGetUser.mockResolvedValue({ user: { id: USER }, token: 'tok', supabase: { from: mockFrom } });
}
function signedOut() {
    mockGetUser.mockResolvedValue(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }));
}

function createRequest(url: string, options?: RequestInit): NextRequest {
    return new NextRequest(url, options as never);
}

describe('/api/food-logs', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('GET', () => {
        it('returns 401 without a token', async () => {
            signedOut();
            const res = await GET(createRequest('http://localhost/api/food-logs?userId=user-1'));
            expect(res.status).toBe(401);
        });

        it("returns the caller's logs for a specific date (userId in the query is ignored)", async () => {
            signedIn();
            const q = chain({ data: [{ id: 'log-1', food_name: 'Chicken', calories: 165, meal_type: 'lunch' }], error: null });
            mockFrom.mockReturnValue(q);

            const res = await GET(createRequest('http://localhost/api/food-logs?userId=someone-else&date=2025-01-15'));
            const data = await res.json();

            expect(res.status).toBe(200);
            expect(data.logs).toHaveLength(1);
            expect(data.logs[0].food_name).toBe('Chicken');
            expect(q.eq).toHaveBeenCalledWith('user_id', USER);
            expect(q.eq).toHaveBeenCalledWith('logged_date', '2025-01-15');
        });

        it('returns logs for a date range', async () => {
            signedIn();
            const q = chain({ data: [{ id: 'log-1', logged_date: '2025-01-15' }, { id: 'log-2', logged_date: '2025-01-16' }], error: null });
            mockFrom.mockReturnValue(q);

            const res = await GET(createRequest('http://localhost/api/food-logs?startDate=2025-01-15&endDate=2025-01-16'));
            const data = await res.json();

            expect(res.status).toBe(200);
            expect(data.logs).toHaveLength(2);
            expect(q.gte).toHaveBeenCalledWith('logged_date', '2025-01-15');
            expect(q.lte).toHaveBeenCalledWith('logged_date', '2025-01-16');
        });

        it('uses today as default date when date is not provided', async () => {
            signedIn();
            const q = chain({ data: [], error: null });
            mockFrom.mockReturnValue(q);
            const today = new Date().toISOString().split('T')[0];

            const res = await GET(createRequest('http://localhost/api/food-logs'));

            expect(res.status).toBe(200);
            expect(q.eq).toHaveBeenCalledWith('logged_date', today);
        });

        it('returns 500 on database error', async () => {
            signedIn();
            mockFrom.mockReturnValue(chain({ data: null, error: { message: 'DB error' } }));

            const res = await GET(createRequest('http://localhost/api/food-logs?date=2025-01-15'));
            const data = await res.json();

            expect(res.status).toBe(500);
            expect(data.error).toBe('Failed to fetch food logs');
        });
    });

    describe('POST', () => {
        it('returns 400 when required fields are missing', async () => {
            signedIn();
            const res = await POST(createRequest('http://localhost/api/food-logs', {
                method: 'POST',
                body: JSON.stringify({ food_name: 'Test' }),
            }));
            const data = await res.json();
            expect(res.status).toBe(400);
            expect(data.error).toBe('food_name and meal_type are required');
        });

        it('returns 400 for invalid meal_type', async () => {
            signedIn();
            const res = await POST(createRequest('http://localhost/api/food-logs', {
                method: 'POST',
                body: JSON.stringify({ food_name: 'Test', meal_type: 'brunch' }),
            }));
            const data = await res.json();
            expect(res.status).toBe(400);
            expect(data.error).toBe('meal_type must be breakfast, lunch, dinner, or snack');
        });

        it('creates a food log for the caller (user_id in the body is ignored)', async () => {
            signedIn();
            const mockLog = { id: 'log-1', user_id: USER, food_name: 'Chicken Breast', meal_type: 'lunch', calories: 165 };
            const q = chain({ data: mockLog, error: null });
            mockFrom.mockReturnValue(q);

            const res = await POST(createRequest('http://localhost/api/food-logs', {
                method: 'POST',
                body: JSON.stringify({ user_id: 'someone-else', food_name: 'Chicken Breast', meal_type: 'lunch', calories: 165, protein_g: 31, carbs_g: 0, fat_g: 3.6 }),
            }));
            const data = await res.json();

            expect(res.status).toBe(201);
            expect(data.log.food_name).toBe('Chicken Breast');
            const inserted = (q.insert as jest.Mock).mock.calls[0][0][0];
            expect(inserted.user_id).toBe(USER);
            expect(inserted.protein_g).toBe(31);
        });

        it('returns 500 on database error', async () => {
            signedIn();
            mockFrom.mockReturnValue(chain({ data: null, error: { message: 'DB error' } }));

            const res = await POST(createRequest('http://localhost/api/food-logs', {
                method: 'POST',
                body: JSON.stringify({ food_name: 'Test', meal_type: 'lunch' }),
            }));
            const data = await res.json();

            expect(res.status).toBe(500);
            expect(data.error).toBe('Failed to create food log');
        });
    });

    describe('DELETE', () => {
        it('returns 400 when id is missing', async () => {
            signedIn();
            const res = await DELETE(createRequest('http://localhost/api/food-logs'));
            const data = await res.json();
            expect(res.status).toBe(400);
            expect(data.error).toBe('id is required');
        });

        it("deletes the caller's food log", async () => {
            signedIn();
            const q = chain({ error: null });
            mockFrom.mockReturnValue(q);

            const res = await DELETE(createRequest('http://localhost/api/food-logs?id=log-1'));
            const data = await res.json();

            expect(res.status).toBe(200);
            expect(data.success).toBe(true);
            expect(q.eq).toHaveBeenCalledWith('id', 'log-1');
            expect(q.eq).toHaveBeenCalledWith('user_id', USER);
        });

        it('returns 500 on database error', async () => {
            signedIn();
            mockFrom.mockReturnValue(chain({ error: { message: 'DB error' } }));

            const res = await DELETE(createRequest('http://localhost/api/food-logs?id=log-1'));
            const data = await res.json();

            expect(res.status).toBe(500);
            expect(data.error).toBe('Failed to delete food log');
        });
    });
});
