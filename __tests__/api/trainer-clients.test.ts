/**
 * @jest-environment node
 */
import { NextRequest, NextResponse } from 'next/server';
import { GET } from '@/app/api/trainer/clients/route';

// auth.supabase (RLS) and getAdmin() (service role) are separate clients
const mockFrom = jest.fn();
const mockAdminFrom = jest.fn();
const mockRequireTrainer = jest.fn();

jest.mock('@/lib/auth', () => {
    const { NextResponse: Res } = jest.requireActual('next/server');
    return {
        requireTrainer: (...args: unknown[]) => mockRequireTrainer(...args),
        isErrorResponse: (r: unknown) => r instanceof Res,
        getAdmin: () => ({ from: (...args: unknown[]) => mockAdminFrom(...args) }),
    };
});

const TRAINER_ID = 'trainer-1';

/** Mirrors lib/auth requireTrainer: 401 without a token, 403 unless the caller is a trainer. */
function trainerAuthFor(role: 'trainer' | 'trainee') {
    return (request: Request) => {
        if (!request.headers.get('Authorization')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        if (role !== 'trainer') {
            return NextResponse.json({ error: 'Trainer account required' }, { status: 403 });
        }
        return {
            user: { id: TRAINER_ID },
            token: 'test-token',
            supabase: { from: (...args: unknown[]) => mockFrom(...args) },
            profile: { id: TRAINER_ID, role },
        };
    };
}

function createRequest(url: string, withAuth = true) {
    return new NextRequest(`http://localhost:3000${url}`, {
        headers: withAuth ? { Authorization: 'Bearer test-token' } : {},
    });
}

type Result = { data: unknown; error: unknown };

function buildChain(resolvedValue: Result) {
    const chain: Record<string, jest.Mock> = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        in: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue(resolvedValue),
        filter: jest.fn().mockReturnThis(),
    };
    return chain;
}

/** Table-by-table responses for one active client of TRAINER_ID. */
function tablesFor(athleteId: string, opts: { workoutLogs: unknown[]; assignments: unknown[] }) {
    const relationshipsChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
    };
    (relationshipsChain.eq as jest.Mock)
        .mockReturnValueOnce(relationshipsChain)
        .mockResolvedValueOnce({
            data: [{
                id: 'rel-1',
                coach_id: TRAINER_ID,
                athlete_id: athleteId,
                status: 'active',
                can_assign_plans: true,
                can_view_workouts: true,
            }],
            error: null,
        });

    return (table: string) => {
        if (table === 'coaching_relationships') return relationshipsChain;
        if (table === 'profiles') {
            return {
                select: jest.fn().mockReturnValue({
                    in: jest.fn().mockResolvedValue({
                        data: [{
                            id: athleteId,
                            email: 'athlete@test.com',
                            username: 'athlete1',
                            full_name: 'Test Athlete',
                            avatar_url: null,
                            role: 'trainee',
                        }],
                        error: null,
                    }),
                }),
            };
        }
        if (table === 'workout_logs') {
            return {
                select: jest.fn().mockReturnValue({
                    in: jest.fn().mockReturnValue({
                        order: jest.fn().mockResolvedValue({ data: opts.workoutLogs, error: null }),
                    }),
                }),
            };
        }
        if (table === 'training_plan_assignments') {
            return {
                select: jest.fn().mockReturnValue({
                    in: jest.fn().mockReturnValue({
                        eq: jest.fn().mockResolvedValue({ data: opts.assignments, error: null }),
                    }),
                }),
            };
        }
        if (table === 'training_plans') {
            return {
                select: jest.fn().mockReturnValue({
                    in: jest.fn().mockResolvedValue({
                        data: [{ id: 'plan-1', name: 'Strength Program' }],
                        error: null,
                    }),
                }),
            };
        }
        return buildChain({ data: [], error: null });
    };
}

describe('/api/trainer/clients', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockRequireTrainer.mockImplementation(trainerAuthFor('trainer'));
    });

    it('returns 401 when no auth header is provided', async () => {
        const response = await GET(createRequest('/api/trainer/clients?trainerId=trainer-1', false));
        const data = await response.json();

        expect(response.status).toBe(401);
        expect(data.error).toBe('Unauthorized');
        expect(mockFrom).not.toHaveBeenCalled();
    });

    it('returns 403 when the caller is not a trainer', async () => {
        mockRequireTrainer.mockImplementation(trainerAuthFor('trainee'));

        const response = await GET(createRequest('/api/trainer/clients'));
        const data = await response.json();

        expect(response.status).toBe(403);
        expect(data.error).toBe('Trainer account required');
        expect(mockFrom).not.toHaveBeenCalled();
    });

    it('returns empty clients when no coaching relationships exist', async () => {
        const relChain = buildChain({ data: [], error: null });
        relChain.eq = jest.fn().mockReturnValueOnce(relChain).mockResolvedValueOnce({ data: [], error: null });
        mockFrom.mockReturnValue(relChain);

        const response = await GET(createRequest('/api/trainer/clients'));
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.clients).toEqual([]);
    });

    it('lists the caller\'s clients and ignores the trainerId query param', async () => {
        const athleteId = 'athlete-1';
        const today = new Date().toISOString().split('T')[0];
        const tables = tablesFor(athleteId, {
            workoutLogs: [{ user_id: athleteId, date: today, completed_at: new Date().toISOString() }],
            assignments: [{ user_id: athleteId, plan_id: 'plan-1', is_active: true, start_date: '2024-01-01', end_date: '2025-12-31' }],
        });
        mockFrom.mockImplementation(tables);
        mockAdminFrom.mockImplementation(tables);

        const response = await GET(createRequest('/api/trainer/clients?trainerId=someone-else'));
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.clients).toHaveLength(1);
        expect(data.clients[0].username).toBe('athlete1');
        expect(data.clients[0].full_name).toBe('Test Athlete');
        expect(data.clients[0].lastWorkoutDate).toBe(today);
        expect(data.clients[0].currentPlan).toBe('Strength Program');
        expect(data.clients[0].streak).toBeGreaterThanOrEqual(1);
        expect(data.clients[0].relationshipId).toBe('rel-1');
        expect(data.clients[0].canAssignPlans).toBe(true);
        expect(data.clients[0].canViewWorkouts).toBe(true);

        // Relationships are the caller's, not the query param's
        const relationshipsChain = mockFrom.mock.results.find(
            (_, i) => mockFrom.mock.calls[i][0] === 'coaching_relationships'
        )!.value;
        expect(relationshipsChain.eq).toHaveBeenCalledWith('coach_id', TRAINER_ID);

        // Only the plan-name lookup goes through the service role
        expect(mockAdminFrom).toHaveBeenCalledTimes(1);
        expect(mockAdminFrom).toHaveBeenCalledWith('training_plans');
        expect(mockFrom).not.toHaveBeenCalledWith('training_plans');
    });

    it('returns 500 when database query fails', async () => {
        mockFrom.mockImplementation(() => ({
            select: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                    eq: jest.fn().mockResolvedValue({
                        data: null,
                        error: { message: 'Database connection failed' },
                    }),
                }),
            }),
        }));

        const response = await GET(createRequest('/api/trainer/clients'));
        const data = await response.json();

        expect(response.status).toBe(500);
        expect(data.error).toBe('Internal Server Error');
    });

    it('returns clients with zero streak when no workout logs exist', async () => {
        const athleteId = 'athlete-2';
        const tables = tablesFor(athleteId, { workoutLogs: [], assignments: [] });
        mockFrom.mockImplementation(tables);
        mockAdminFrom.mockImplementation(tables);

        const response = await GET(createRequest('/api/trainer/clients'));
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.clients).toHaveLength(1);
        expect(data.clients[0].lastWorkoutDate).toBeNull();
        expect(data.clients[0].currentPlan).toBeNull();
        expect(data.clients[0].streak).toBe(0);
        expect(mockAdminFrom).not.toHaveBeenCalled();
    });
});
