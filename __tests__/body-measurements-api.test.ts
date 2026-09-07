/**
 * @jest-environment node
 */
import { GET, POST, PUT, DELETE } from '@/app/api/body-measurements/route';
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

/** A query builder whose every method returns itself and which resolves to `result` when awaited. */
function chain(result: { data?: unknown; error?: unknown }) {
    const c: Record<string, unknown> = {};
    for (const m of ['select', 'insert', 'update', 'upsert', 'delete', 'eq', 'in', 'order', 'limit', 'single', 'maybeSingle']) {
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
    return new NextRequest(new URL(url, 'http://localhost:3000'), options as never);
}

describe('Body Measurements API', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('GET /api/body-measurements', () => {
        it('returns 401 without a token', async () => {
            signedOut();
            const res = await GET(createRequest('/api/body-measurements?userId=user-1'));
            expect(res.status).toBe(401);
        });

        it("returns the caller's measurements, ignoring userId in the query", async () => {
            signedIn();
            const mockMeasurements = [{ id: 'meas-1', user_id: USER, date: '2026-01-27', weight_kg: 80, waist_cm: 85 }];
            const q = chain({ data: mockMeasurements, error: null });
            mockFrom.mockReturnValue(q);

            const res = await GET(createRequest('/api/body-measurements?userId=someone-else'));
            expect(res.status).toBe(200);
            const body = await res.json();
            expect(body.measurements).toEqual(mockMeasurements);
            expect(mockFrom).toHaveBeenCalledWith('body_measurements');
            expect(q.eq).toHaveBeenCalledWith('user_id', USER);
        });

        it('returns 500 on database error', async () => {
            signedIn();
            mockFrom.mockReturnValue(chain({ data: null, error: { message: 'DB error' } }));
            const res = await GET(createRequest('/api/body-measurements'));
            expect(res.status).toBe(500);
        });
    });

    describe('POST /api/body-measurements', () => {
        it('returns 401 without a token', async () => {
            signedOut();
            const res = await POST(createRequest('/api/body-measurements', {
                method: 'POST',
                body: JSON.stringify({ weight_kg: 80 }),
                headers: { 'Content-Type': 'application/json' },
            }));
            expect(res.status).toBe(401);
        });

        it('creates a measurement for the caller (user_id in the body is ignored)', async () => {
            signedIn();
            const mockCreated = { id: 'meas-new', user_id: USER, date: '2026-01-27', weight_kg: 80 };
            const q = chain({ data: mockCreated, error: null });
            mockFrom.mockReturnValue(q);

            const res = await POST(createRequest('/api/body-measurements', {
                method: 'POST',
                body: JSON.stringify({ user_id: 'someone-else', date: '2026-01-27', weight_kg: 80, waist_cm: 85 }),
                headers: { 'Content-Type': 'application/json' },
            }));
            expect(res.status).toBe(201);
            const body = await res.json();
            expect(body.measurement).toEqual(mockCreated);
            const inserted = (q.insert as jest.Mock).mock.calls[0][0][0];
            expect(inserted.user_id).toBe(USER);
            expect(inserted.waist_cm).toBe(85);
        });

        it('uses current date if not provided', async () => {
            signedIn();
            const q = chain({ data: { id: 'meas-new' }, error: null });
            mockFrom.mockReturnValue(q);

            const res = await POST(createRequest('/api/body-measurements', {
                method: 'POST',
                body: JSON.stringify({ weight_kg: 75 }),
                headers: { 'Content-Type': 'application/json' },
            }));
            expect(res.status).toBe(201);
            const inserted = (q.insert as jest.Mock).mock.calls[0][0][0];
            expect(inserted.date).toBe(new Date().toISOString().split('T')[0]);
        });
    });

    describe('PUT /api/body-measurements', () => {
        it('returns 400 if id is missing', async () => {
            signedIn();
            const res = await PUT(createRequest('/api/body-measurements', {
                method: 'PUT',
                body: JSON.stringify({ weight_kg: 80 }),
                headers: { 'Content-Type': 'application/json' },
            }));
            expect(res.status).toBe(400);
        });

        it('updates a measurement successfully', async () => {
            signedIn();
            const q = chain({ data: { id: 'meas-1', user_id: USER, date: '2026-01-27', weight_kg: 79 }, error: null });
            mockFrom.mockReturnValue(q);

            const res = await PUT(createRequest('/api/body-measurements', {
                method: 'PUT',
                body: JSON.stringify({ id: 'meas-1', weight_kg: 79 }),
                headers: { 'Content-Type': 'application/json' },
            }));
            expect(res.status).toBe(200);
            const body = await res.json();
            expect(body.measurement.weight_kg).toBe(79);
            expect(q.eq).toHaveBeenCalledWith('id', 'meas-1');
            expect(q.eq).toHaveBeenCalledWith('user_id', USER);
        });
    });

    describe('DELETE /api/body-measurements', () => {
        it('returns 400 if id is missing', async () => {
            signedIn();
            const res = await DELETE(createRequest('/api/body-measurements'));
            expect(res.status).toBe(400);
        });

        it('deletes a measurement successfully', async () => {
            signedIn();
            const q = chain({ error: null });
            mockFrom.mockReturnValue(q);

            const res = await DELETE(createRequest('/api/body-measurements?id=meas-1'));
            expect(res.status).toBe(200);
            const body = await res.json();
            expect(body.success).toBe(true);
            expect(q.eq).toHaveBeenCalledWith('user_id', USER);
        });
    });
});
