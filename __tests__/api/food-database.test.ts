/**
 * @jest-environment node
 */
import { GET, POST } from '@/app/api/food-database/route';
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
    for (const m of ['select', 'insert', 'eq', 'ilike', 'order', 'limit', 'single']) {
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

describe('/api/food-database', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('GET', () => {
        it('returns 401 without a token', async () => {
            signedOut();
            const res = await GET(createRequest('http://localhost/api/food-database?q=chicken'));
            expect(res.status).toBe(401);
        });

        it('returns 400 when query is too short', async () => {
            signedIn();
            const res = await GET(createRequest('http://localhost/api/food-database?q=a'));
            const data = await res.json();
            expect(res.status).toBe(400);
            expect(data.error).toBe('Search query must be at least 2 characters');
        });

        it('searches for foods by query', async () => {
            signedIn();
            const q = chain({ data: [{ id: 'f1', name: 'Chicken Breast', calories: 165 }], error: null });
            mockFrom.mockReturnValue(q);

            const res = await GET(createRequest('http://localhost/api/food-database?q=chicken'));
            const data = await res.json();

            expect(res.status).toBe(200);
            expect(data.foods).toHaveLength(1);
            expect(data.foods[0].name).toBe('Chicken Breast');
            expect(mockFrom).toHaveBeenCalledWith('food_database');
            expect(q.ilike).toHaveBeenCalledWith('name', '%chicken%');
        });

        it('gets foods by category', async () => {
            signedIn();
            const q = chain({ data: [{ id: 'f1', name: 'Brown Rice', category: 'grains' }], error: null });
            mockFrom.mockReturnValue(q);

            const res = await GET(createRequest('http://localhost/api/food-database?category=grains'));
            const data = await res.json();

            expect(res.status).toBe(200);
            expect(data.foods).toHaveLength(1);
            expect(q.eq).toHaveBeenCalledWith('category', 'grains');
        });

        it('returns 500 on database error', async () => {
            signedIn();
            mockFrom.mockReturnValue(chain({ data: null, error: { message: 'DB error' } }));

            const res = await GET(createRequest('http://localhost/api/food-database?q=chicken'));
            const data = await res.json();

            expect(res.status).toBe(500);
            expect(data.error).toBe('Failed to search food database');
        });
    });

    describe('POST', () => {
        it('returns 400 when name is missing', async () => {
            signedIn();
            const res = await POST(createRequest('http://localhost/api/food-database', {
                method: 'POST',
                body: JSON.stringify({ calories: 100 }),
            }));
            const data = await res.json();
            expect(res.status).toBe(400);
            expect(data.error).toBe('Food name is required');
        });

        it('creates a food item attributed to the caller', async () => {
            signedIn();
            const mockFood = { id: 'f1', name: 'Custom Protein Bar', calories: 200, protein_g: 20, carbs_g: 25, fat_g: 8 };
            const q = chain({ data: mockFood, error: null });
            mockFrom.mockReturnValue(q);

            const res = await POST(createRequest('http://localhost/api/food-database', {
                method: 'POST',
                body: JSON.stringify({ name: 'Custom Protein Bar', calories: 200, protein_g: 20, carbs_g: 25, fat_g: 8, created_by: 'someone-else' }),
            }));
            const data = await res.json();

            expect(res.status).toBe(201);
            expect(data.food.name).toBe('Custom Protein Bar');
            const inserted = (q.insert as jest.Mock).mock.calls[0][0][0];
            expect(inserted.created_by).toBe(USER);
            expect(inserted.is_verified).toBe(false);
        });

        it('returns 500 on database error', async () => {
            signedIn();
            mockFrom.mockReturnValue(chain({ data: null, error: { message: 'DB error' } }));

            const res = await POST(createRequest('http://localhost/api/food-database', {
                method: 'POST',
                body: JSON.stringify({ name: 'Test Food' }),
            }));
            const data = await res.json();

            expect(res.status).toBe(500);
            expect(data.error).toBe('Failed to create food item');
        });
    });
});
