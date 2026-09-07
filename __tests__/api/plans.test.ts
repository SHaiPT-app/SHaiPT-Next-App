/**
 * @jest-environment node
 */
import { GET, POST, PUT } from '@/app/api/plans/route';
import { NextResponse } from 'next/server';

const mockGetUser = jest.fn();
const mockFrom = jest.fn();

jest.mock('@/lib/auth', () => {
    const { NextResponse: NR } = jest.requireActual('next/server');
    return {
        getUser: (...args: unknown[]) => mockGetUser(...args),
        isErrorResponse: (r: unknown) => r instanceof NR,
        forbidden: (message = 'Forbidden') => NR.json({ error: message }, { status: 403 }),
        getAdmin: jest.fn(),
        userClient: jest.fn(),
        bearerToken: jest.fn(),
    };
});

function chain(result: { data?: unknown; error?: unknown }) {
    const c: Record<string, unknown> = {};
    for (const m of ['select', 'insert', 'update', 'eq', 'order', 'single', 'maybeSingle']) {
        c[m] = jest.fn(() => c);
    }
    c.then = (res: (v: unknown) => unknown, rej?: (e: unknown) => unknown) => Promise.resolve(result).then(res, rej);
    return c;
}

const TRAINER = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
const TRAINEE = '550e8400-e29b-41d4-a716-446655440000';
const STRANGER = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';

function signedInAs(id: string) {
    mockGetUser.mockResolvedValue({ user: { id }, token: 'tok', supabase: { from: mockFrom } });
}
function signedOut() {
    mockGetUser.mockResolvedValue(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }));
}

describe('/api/plans', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('GET', () => {
        it('returns 401 without a token', async () => {
            signedOut();
            const response = await GET(new Request(`http://localhost:3000/api/plans?traineeId=${TRAINEE}`));
            expect(response.status).toBe(401);
        });

        it('returns active plans for a trainee through the caller-scoped client', async () => {
            signedInAs(TRAINEE);
            const q = chain({ data: [{ id: 'plan-1', name: 'Plan 1' }], error: null });
            mockFrom.mockReturnValue(q);

            const response = await GET(new Request(`http://localhost:3000/api/plans?traineeId=${TRAINEE}`));
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data.plans).toHaveLength(1);
            expect(data.plans[0].name).toBe('Plan 1');
            expect(mockFrom).toHaveBeenCalledWith('workout_plans');
            expect(q.eq).toHaveBeenCalledWith('trainee_id', TRAINEE);
            expect(q.eq).toHaveBeenCalledWith('is_active', true);
        });
    });

    describe('POST', () => {
        it('returns 403 when the caller is neither the trainer nor the trainee', async () => {
            signedInAs(STRANGER);
            const response = await POST(new Request('http://localhost:3000/api/plans', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: 'New Plan', trainee_id: TRAINEE, trainer_id: TRAINER }),
            }));
            expect(response.status).toBe(403);
            expect(mockFrom).not.toHaveBeenCalled();
        });

        it('creates a new plan when the caller is the trainer', async () => {
            signedInAs(TRAINER);
            const trainerLookup = chain({ data: { id: TRAINER }, error: null });
            const traineeLookup = chain({ data: { id: TRAINEE }, error: null });
            const insertQ = chain({ data: { id: 'new-plan', name: 'New Plan' }, error: null });
            mockFrom.mockReturnValueOnce(trainerLookup).mockReturnValueOnce(traineeLookup).mockReturnValueOnce(insertQ);

            const response = await POST(new Request('http://localhost:3000/api/plans', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: 'New Plan', trainee_id: TRAINEE, trainer_id: TRAINER, sessions: [] }),
            }));
            const data = await response.json();

            expect(response.status).toBe(201);
            expect(data.plan.id).toBe('new-plan');
            expect(mockFrom).toHaveBeenNthCalledWith(1, 'profiles');
            expect(mockFrom).toHaveBeenNthCalledWith(2, 'profiles');
            expect(mockFrom).toHaveBeenNthCalledWith(3, 'workout_plans');
            const inserted = (insertQ.insert as jest.Mock).mock.calls[0][0][0];
            expect(inserted).toMatchObject({ trainee_id: TRAINEE, trainer_id: TRAINER, name: 'New Plan', exercises: [] });
        });

        it('returns 400 when the trainee does not exist', async () => {
            signedInAs(TRAINER);
            mockFrom
                .mockReturnValueOnce(chain({ data: { id: TRAINER }, error: null }))
                .mockReturnValueOnce(chain({ data: null, error: null }));

            const response = await POST(new Request('http://localhost:3000/api/plans', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: 'New Plan', trainee_id: TRAINEE, trainer_id: TRAINER }),
            }));
            expect(response.status).toBe(400);
        });
    });

    describe('PUT', () => {
        it('updates a plan through the caller-scoped client', async () => {
            signedInAs(TRAINER);
            const q = chain({ data: { id: 'plan-1', name: 'Renamed' }, error: null });
            mockFrom.mockReturnValue(q);

            const response = await PUT(new Request('http://localhost:3000/api/plans', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: 'plan-1', name: 'Renamed' }),
            }));
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data.plan.name).toBe('Renamed');
            expect(q.update).toHaveBeenCalledWith({ name: 'Renamed' });
            expect(q.eq).toHaveBeenCalledWith('id', 'plan-1');
        });
    });
});
