/**
 * @jest-environment node
 */
import { GET } from '@/app/api/trainer/clients/route';

// Mock supabase
const mockSelect = jest.fn();
const mockEq = jest.fn();
const mockIn = jest.fn();
const mockOrder = jest.fn();

const mockFrom = jest.fn();

jest.mock('@/lib/supabase', () => ({
    supabase: {
        from: (...args: any[]) => mockFrom(...args),
    },
}));

function buildChain(resolvedValue: { data: any; error: any }) {
    const chain: any = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        in: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue(resolvedValue),
        filter: jest.fn().mockReturnThis(),
    };
    return chain;
}

describe('/api/trainer/clients', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('returns 400 when trainerId is missing', async () => {
        const req = new Request('http://localhost:3000/api/trainer/clients', {
            headers: { Authorization: 'Bearer test-token' },
        });
        const response = await GET(req);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toBe('trainerId is required');
    });

    it('returns 401 when no auth header is provided', async () => {
        const req = new Request('http://localhost:3000/api/trainer/clients?trainerId=trainer-1');
        const response = await GET(req);
        const data = await response.json();

        expect(response.status).toBe(401);
        expect(data.error).toBe('Unauthorized');
    });

    it('returns empty clients when no coaching relationships exist', async () => {
        const relChain = buildChain({ data: [], error: null });
        mockFrom.mockReturnValue(relChain);

        const req = new Request('http://localhost:3000/api/trainer/clients?trainerId=trainer-1', {
            headers: { Authorization: 'Bearer test-token' },
        });
        const response = await GET(req);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.clients).toEqual([]);
    });

    it('returns clients with stats when coaching relationships exist', async () => {
        const trainerId = 'trainer-1';
        const athleteId = 'athlete-1';

        // Track call count to return different data for different tables
        let callCount = 0;
        mockFrom.mockImplementation((table: string) => {
            if (table === 'coaching_relationships') {
                return {
                    select: jest.fn().mockReturnValue({
                        eq: jest.fn().mockReturnValue({
                            eq: jest.fn().mockResolvedValue({
                                data: [{
                                    id: 'rel-1',
                                    coach_id: trainerId,
                                    athlete_id: athleteId,
                                    status: 'active',
                                    can_assign_plans: true,
                                    can_view_workouts: true,
                                }],
                                error: null,
                            }),
                        }),
                    }),
                };
            }
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
                            order: jest.fn().mockResolvedValue({
                                data: [{
                                    user_id: athleteId,
                                    date: new Date().toISOString().split('T')[0],
                                    completed_at: new Date().toISOString(),
                                }],
                                error: null,
                            }),
                        }),
                    }),
                };
            }
            if (table === 'training_plan_assignments') {
                return {
                    select: jest.fn().mockReturnValue({
                        in: jest.fn().mockReturnValue({
                            eq: jest.fn().mockResolvedValue({
                                data: [{
                                    user_id: athleteId,
                                    plan_id: 'plan-1',
                                    is_active: true,
                                    start_date: '2024-01-01',
                                    end_date: '2025-12-31',
                                }],
                                error: null,
                            }),
                        }),
                    }),
                };
            }
            if (table === 'training_plans') {
                return {
                    select: jest.fn().mockReturnValue({
                        in: jest.fn().mockResolvedValue({
                            data: [{
                                id: 'plan-1',
                                name: 'Strength Program',
                            }],
                            error: null,
                        }),
                    }),
                };
            }
            return buildChain({ data: [], error: null });
        });

        const req = new Request(`http://localhost:3000/api/trainer/clients?trainerId=${trainerId}`, {
            headers: { Authorization: 'Bearer test-token' },
        });
        const response = await GET(req);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.clients).toHaveLength(1);
        expect(data.clients[0].username).toBe('athlete1');
        expect(data.clients[0].full_name).toBe('Test Athlete');
        expect(data.clients[0].lastWorkoutDate).toBe(new Date().toISOString().split('T')[0]);
        expect(data.clients[0].currentPlan).toBe('Strength Program');
        expect(data.clients[0].streak).toBeGreaterThanOrEqual(1);
        expect(data.clients[0].relationshipId).toBe('rel-1');
        expect(data.clients[0].canAssignPlans).toBe(true);
        expect(data.clients[0].canViewWorkouts).toBe(true);
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

        const req = new Request('http://localhost:3000/api/trainer/clients?trainerId=trainer-1', {
            headers: { Authorization: 'Bearer test-token' },
        });
        const response = await GET(req);
        const data = await response.json();

        expect(response.status).toBe(500);
        expect(data.error).toBe('Internal Server Error');
    });

    it('returns clients with zero streak when no workout logs exist', async () => {
        const trainerId = 'trainer-1';
        const athleteId = 'athlete-2';

        mockFrom.mockImplementation((table: string) => {
            if (table === 'coaching_relationships') {
                return {
                    select: jest.fn().mockReturnValue({
                        eq: jest.fn().mockReturnValue({
                            eq: jest.fn().mockResolvedValue({
                                data: [{
                                    id: 'rel-2',
                                    coach_id: trainerId,
                                    athlete_id: athleteId,
                                    status: 'active',
                                    can_assign_plans: true,
                                    can_view_workouts: true,
                                }],
                                error: null,
                            }),
                        }),
                    }),
                };
            }
            if (table === 'profiles') {
                return {
                    select: jest.fn().mockReturnValue({
                        in: jest.fn().mockResolvedValue({
                            data: [{
                                id: athleteId,
                                email: 'athlete2@test.com',
                                username: 'athlete2',
                                full_name: null,
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
                            order: jest.fn().mockResolvedValue({
                                data: [],
                                error: null,
                            }),
                        }),
                    }),
                };
            }
            if (table === 'training_plan_assignments') {
                return {
                    select: jest.fn().mockReturnValue({
                        in: jest.fn().mockReturnValue({
                            eq: jest.fn().mockResolvedValue({
                                data: [],
                                error: null,
                            }),
                        }),
                    }),
                };
            }
            return buildChain({ data: [], error: null });
        });

        const req = new Request(`http://localhost:3000/api/trainer/clients?trainerId=${trainerId}`, {
            headers: { Authorization: 'Bearer test-token' },
        });
        const response = await GET(req);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.clients).toHaveLength(1);
        expect(data.clients[0].lastWorkoutDate).toBeNull();
        expect(data.clients[0].currentPlan).toBeNull();
        expect(data.clients[0].streak).toBe(0);
    });
});
