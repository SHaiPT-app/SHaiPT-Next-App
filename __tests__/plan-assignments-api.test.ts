/**
 * @jest-environment node
 */
import { NextRequest, NextResponse } from 'next/server';
import { GET, POST } from '@/app/api/plan-assignments/route';

const mockFrom = jest.fn();
const mockGetUser = jest.fn();

jest.mock('@/lib/auth', () => {
    const { NextResponse: Res } = jest.requireActual('next/server');
    return {
        getUser: (...args: unknown[]) => mockGetUser(...args),
        isErrorResponse: (r: unknown) => r instanceof Res,
        getAdmin: jest.fn(),
    };
});

const CALLER_ID = 'trainer-1';

/** Mirrors lib/auth getUser: 401 without a bearer token, otherwise the caller's context. */
function authFor(request: Request) {
    if (!request.headers.get('Authorization')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return {
        user: { id: CALLER_ID },
        token: 'test-token',
        supabase: { from: (...args: unknown[]) => mockFrom(...args) },
    };
}

type Result = { data: unknown; error: unknown };

/** A query builder whose every method chains and whose terminal calls resolve to `result`. */
function chain(result: Result | Error) {
    const terminal = () => (result instanceof Error ? Promise.reject(result) : Promise.resolve(result));
    const c: Record<string, jest.Mock> = {};
    for (const m of ['select', 'eq', 'in', 'insert', 'update', 'delete', 'limit']) {
        c[m] = jest.fn().mockReturnValue(c);
    }
    c.maybeSingle = jest.fn().mockImplementation(terminal);
    c.single = jest.fn().mockImplementation(terminal);
    c.order = jest.fn().mockImplementation(terminal);
    return c;
}

function useTables(tables: Record<string, ReturnType<typeof chain>>) {
    mockFrom.mockImplementation((table: string) => tables[table] ?? chain({ data: null, error: null }));
    return tables;
}

const activeRelationship = { id: 'rel-1', can_assign_plans: true };

function createRequest(url: string, options?: RequestInit & { noAuth?: boolean }): NextRequest {
    const { noAuth, ...init } = options ?? {};
    return new NextRequest(new URL(url, 'http://localhost:3000'), {
        ...init,
        headers: {
            'Content-Type': 'application/json',
            ...(noAuth ? {} : { Authorization: 'Bearer test-token' }),
            ...(init.headers as Record<string, string> | undefined),
        },
    } as never);
}

const postBody = {
    plan_id: 'plan-1',
    user_id: 'athlete-1',
    start_date: '2026-01-27',
    end_date: '2026-03-27',
};

describe('Plan Assignments API', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockGetUser.mockImplementation(authFor);
    });

    describe('POST /api/plan-assignments', () => {
        it('returns 401 without a token', async () => {
            const req = createRequest('/api/plan-assignments', {
                method: 'POST',
                body: JSON.stringify(postBody),
                noAuth: true,
            });
            const res = await POST(req);
            expect(res.status).toBe(401);
            expect(mockFrom).not.toHaveBeenCalled();
        });

        it('returns 400 if required fields are missing', async () => {
            const req = createRequest('/api/plan-assignments', {
                method: 'POST',
                body: JSON.stringify({ plan_id: 'plan-1' }),
            });
            const res = await POST(req);
            expect(res.status).toBe(400);
            const body = await res.json();
            expect(body.error).toContain('required');
        });

        it('returns 403 if the caller has no active coaching relationship with the user', async () => {
            useTables({ coaching_relationships: chain({ data: null, error: null }) });

            const req = createRequest('/api/plan-assignments', {
                method: 'POST',
                body: JSON.stringify(postBody),
            });
            const res = await POST(req);
            expect(res.status).toBe(403);
            const body = await res.json();
            expect(body.error).toContain('permission');
        });

        it('returns 403 if coaching relationship lacks can_assign_plans', async () => {
            useTables({
                coaching_relationships: chain({ data: { id: 'rel-1', can_assign_plans: false }, error: null }),
            });

            const req = createRequest('/api/plan-assignments', {
                method: 'POST',
                body: JSON.stringify(postBody),
            });
            const res = await POST(req);
            expect(res.status).toBe(403);
        });

        it('returns 404 if plan does not exist', async () => {
            useTables({
                coaching_relationships: chain({ data: activeRelationship, error: null }),
                training_plans: chain({ data: null, error: null }),
            });

            const req = createRequest('/api/plan-assignments', {
                method: 'POST',
                body: JSON.stringify({ ...postBody, plan_id: 'plan-nonexistent' }),
            });
            const res = await POST(req);
            expect(res.status).toBe(404);
            const body = await res.json();
            expect(body.error).toBe('Plan not found');
        });

        it('creates an assignment by the caller, ignoring assigned_by_id in the body', async () => {
            const mockAssignment = {
                id: 'assign-1',
                plan_id: 'plan-1',
                user_id: 'athlete-1',
                assigned_by_id: CALLER_ID,
                is_self_assigned: false,
                start_date: '2026-01-27',
                end_date: '2026-03-27',
                is_active: true,
                created_at: '2026-01-27T00:00:00.000Z',
            };
            const tables = useTables({
                coaching_relationships: chain({ data: activeRelationship, error: null }),
                training_plans: chain({ data: { id: 'plan-1' }, error: null }),
                training_plan_assignments: chain({ data: mockAssignment, error: null }),
            });

            const req = createRequest('/api/plan-assignments', {
                method: 'POST',
                body: JSON.stringify({ ...postBody, assigned_by_id: 'someone-else' }),
            });
            const res = await POST(req);
            expect(res.status).toBe(201);
            const body = await res.json();
            expect(body.assignment).toEqual(mockAssignment);

            // The relationship is checked from the caller's side
            expect(tables.coaching_relationships.eq).toHaveBeenCalledWith('coach_id', CALLER_ID);
            expect(tables.coaching_relationships.eq).toHaveBeenCalledWith('athlete_id', 'athlete-1');
            expect(tables.training_plan_assignments.insert).toHaveBeenCalledWith([{
                plan_id: 'plan-1',
                user_id: 'athlete-1',
                assigned_by_id: CALLER_ID,
                is_self_assigned: false,
                start_date: '2026-01-27',
                end_date: '2026-03-27',
                is_active: true,
            }]);
        });

        it('returns 500 on database error', async () => {
            useTables({ coaching_relationships: chain(new Error('DB connection failed')) });

            const req = createRequest('/api/plan-assignments', {
                method: 'POST',
                body: JSON.stringify(postBody),
            });
            const res = await POST(req);
            expect(res.status).toBe(500);
        });
    });

    describe('GET /api/plan-assignments', () => {
        const mockAssignments = [
            {
                id: 'assign-1',
                plan_id: 'plan-1',
                user_id: CALLER_ID,
                assigned_by_id: 'coach-1',
                is_self_assigned: false,
                start_date: '2026-01-27',
                end_date: '2026-03-27',
                is_active: true,
            },
        ];

        it('returns 401 without a token', async () => {
            const res = await GET(createRequest('/api/plan-assignments', { noAuth: true }));
            expect(res.status).toBe(401);
            expect(mockFrom).not.toHaveBeenCalled();
        });

        it('returns the caller\'s assignments with plan data, ignoring the userId param', async () => {
            const mockPlan = {
                id: 'plan-1',
                creator_id: 'coach-1',
                name: 'Strength Program',
                description: 'A strength training program',
            };
            const tables = useTables({
                training_plan_assignments: chain({ data: mockAssignments, error: null }),
                training_plans: chain({ data: mockPlan, error: null }),
            });

            const res = await GET(createRequest('/api/plan-assignments?userId=someone-else'));
            expect(res.status).toBe(200);
            const body = await res.json();
            expect(body.assignments).toHaveLength(1);
            expect(body.assignments[0].plan).toEqual(mockPlan);
            expect(body.assignments[0].plan_id).toBe('plan-1');
            expect(tables.training_plan_assignments.eq).toHaveBeenCalledWith('user_id', CALLER_ID);
            expect(tables.training_plan_assignments.eq).not.toHaveBeenCalledWith('user_id', 'someone-else');
        });

        it('returns assignments with null plan when plan lookup fails', async () => {
            useTables({
                training_plan_assignments: chain({ data: mockAssignments, error: null }),
                training_plans: chain({ data: null, error: { message: 'Not found' } }),
            });

            const res = await GET(createRequest('/api/plan-assignments'));
            expect(res.status).toBe(200);
            const body = await res.json();
            expect(body.assignments).toHaveLength(1);
            expect(body.assignments[0].plan).toBeNull();
        });

        it('returns empty array when user has no assignments', async () => {
            useTables({ training_plan_assignments: chain({ data: [], error: null }) });

            const res = await GET(createRequest('/api/plan-assignments'));
            expect(res.status).toBe(200);
            const body = await res.json();
            expect(body.assignments).toEqual([]);
        });

        it('returns 500 on database error', async () => {
            useTables({ training_plan_assignments: chain({ data: null, error: new Error('DB error') }) });

            const res = await GET(createRequest('/api/plan-assignments'));
            expect(res.status).toBe(500);
        });
    });
});
