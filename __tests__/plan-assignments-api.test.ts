/**
 * @jest-environment node
 */
import { GET, POST } from '@/app/api/plan-assignments/route';
import { NextRequest } from 'next/server';

// Mock the db module
jest.mock('@/lib/supabaseDb', () => ({
    db: {
        trainingPlanAssignments: {
            getByUser: jest.fn(),
            create: jest.fn(),
        },
        coachingRelationships: {
            getAsCoach: jest.fn(),
        },
        trainingPlans: {
            getById: jest.fn(),
        },
    },
}));

import { db } from '@/lib/supabaseDb';

const mockedDb = db as jest.Mocked<typeof db>;

function createRequest(url: string, options?: RequestInit): NextRequest {
    return new NextRequest(new URL(url, 'http://localhost:3000'), options as never);
}

describe('Plan Assignments API', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('POST /api/plan-assignments', () => {
        it('returns 400 if required fields are missing', async () => {
            const req = createRequest('/api/plan-assignments', {
                method: 'POST',
                body: JSON.stringify({ plan_id: 'plan-1' }),
                headers: { 'Content-Type': 'application/json' },
            });
            const res = await POST(req);
            expect(res.status).toBe(400);
            const body = await res.json();
            expect(body.error).toContain('required');
        });

        it('returns 403 if trainer has no coaching relationship', async () => {
            (mockedDb.coachingRelationships.getAsCoach as jest.Mock).mockResolvedValue([]);

            const req = createRequest('/api/plan-assignments', {
                method: 'POST',
                body: JSON.stringify({
                    plan_id: 'plan-1',
                    user_id: 'athlete-1',
                    assigned_by_id: 'trainer-1',
                    start_date: '2026-01-27',
                    end_date: '2026-03-27',
                }),
                headers: { 'Content-Type': 'application/json' },
            });
            const res = await POST(req);
            expect(res.status).toBe(403);
            const body = await res.json();
            expect(body.error).toContain('permission');
        });

        it('returns 403 if coaching relationship lacks can_assign_plans', async () => {
            (mockedDb.coachingRelationships.getAsCoach as jest.Mock).mockResolvedValue([
                {
                    id: 'rel-1',
                    coach_id: 'trainer-1',
                    athlete_id: 'athlete-1',
                    status: 'active',
                    can_assign_plans: false,
                    can_view_workouts: true,
                    requested_by: 'trainer-1',
                },
            ]);

            const req = createRequest('/api/plan-assignments', {
                method: 'POST',
                body: JSON.stringify({
                    plan_id: 'plan-1',
                    user_id: 'athlete-1',
                    assigned_by_id: 'trainer-1',
                    start_date: '2026-01-27',
                    end_date: '2026-03-27',
                }),
                headers: { 'Content-Type': 'application/json' },
            });
            const res = await POST(req);
            expect(res.status).toBe(403);
        });

        it('returns 404 if plan does not exist', async () => {
            (mockedDb.coachingRelationships.getAsCoach as jest.Mock).mockResolvedValue([
                {
                    id: 'rel-1',
                    coach_id: 'trainer-1',
                    athlete_id: 'athlete-1',
                    status: 'active',
                    can_assign_plans: true,
                    can_view_workouts: true,
                    requested_by: 'trainer-1',
                },
            ]);
            (mockedDb.trainingPlans.getById as jest.Mock).mockResolvedValue(null);

            const req = createRequest('/api/plan-assignments', {
                method: 'POST',
                body: JSON.stringify({
                    plan_id: 'plan-nonexistent',
                    user_id: 'athlete-1',
                    assigned_by_id: 'trainer-1',
                    start_date: '2026-01-27',
                    end_date: '2026-03-27',
                }),
                headers: { 'Content-Type': 'application/json' },
            });
            const res = await POST(req);
            expect(res.status).toBe(404);
            const body = await res.json();
            expect(body.error).toBe('Plan not found');
        });

        it('creates an assignment successfully', async () => {
            (mockedDb.coachingRelationships.getAsCoach as jest.Mock).mockResolvedValue([
                {
                    id: 'rel-1',
                    coach_id: 'trainer-1',
                    athlete_id: 'athlete-1',
                    status: 'active',
                    can_assign_plans: true,
                    can_view_workouts: true,
                    requested_by: 'trainer-1',
                },
            ]);
            (mockedDb.trainingPlans.getById as jest.Mock).mockResolvedValue({
                id: 'plan-1',
                creator_id: 'trainer-1',
                name: 'Strength Program',
            });

            const mockAssignment = {
                id: 'assign-1',
                plan_id: 'plan-1',
                user_id: 'athlete-1',
                assigned_by_id: 'trainer-1',
                is_self_assigned: false,
                start_date: '2026-01-27',
                end_date: '2026-03-27',
                is_active: true,
                created_at: '2026-01-27T00:00:00.000Z',
            };
            (mockedDb.trainingPlanAssignments.create as jest.Mock).mockResolvedValue(mockAssignment);

            const req = createRequest('/api/plan-assignments', {
                method: 'POST',
                body: JSON.stringify({
                    plan_id: 'plan-1',
                    user_id: 'athlete-1',
                    assigned_by_id: 'trainer-1',
                    start_date: '2026-01-27',
                    end_date: '2026-03-27',
                }),
                headers: { 'Content-Type': 'application/json' },
            });
            const res = await POST(req);
            expect(res.status).toBe(201);
            const body = await res.json();
            expect(body.assignment).toEqual(mockAssignment);
            expect(mockedDb.trainingPlanAssignments.create).toHaveBeenCalledWith({
                plan_id: 'plan-1',
                user_id: 'athlete-1',
                assigned_by_id: 'trainer-1',
                is_self_assigned: false,
                start_date: '2026-01-27',
                end_date: '2026-03-27',
                is_active: true,
            });
        });

        it('returns 500 on database error', async () => {
            (mockedDb.coachingRelationships.getAsCoach as jest.Mock).mockRejectedValue(
                new Error('DB connection failed')
            );

            const req = createRequest('/api/plan-assignments', {
                method: 'POST',
                body: JSON.stringify({
                    plan_id: 'plan-1',
                    user_id: 'athlete-1',
                    assigned_by_id: 'trainer-1',
                    start_date: '2026-01-27',
                    end_date: '2026-03-27',
                }),
                headers: { 'Content-Type': 'application/json' },
            });
            const res = await POST(req);
            expect(res.status).toBe(500);
        });
    });

    describe('GET /api/plan-assignments', () => {
        it('returns 400 if userId is missing', async () => {
            const req = createRequest('/api/plan-assignments');
            const res = await GET(req);
            expect(res.status).toBe(400);
            const body = await res.json();
            expect(body.error).toBe('userId is required');
        });

        it('returns assignments with enriched plan data', async () => {
            const mockAssignments = [
                {
                    id: 'assign-1',
                    plan_id: 'plan-1',
                    user_id: 'user-1',
                    assigned_by_id: 'trainer-1',
                    is_self_assigned: false,
                    start_date: '2026-01-27',
                    end_date: '2026-03-27',
                    is_active: true,
                },
            ];
            (mockedDb.trainingPlanAssignments.getByUser as jest.Mock).mockResolvedValue(mockAssignments);

            const mockPlan = {
                id: 'plan-1',
                creator_id: 'trainer-1',
                name: 'Strength Program',
                description: 'A strength training program',
            };
            (mockedDb.trainingPlans.getById as jest.Mock).mockResolvedValue(mockPlan);

            const req = createRequest('/api/plan-assignments?userId=user-1');
            const res = await GET(req);
            expect(res.status).toBe(200);
            const body = await res.json();
            expect(body.assignments).toHaveLength(1);
            expect(body.assignments[0].plan).toEqual(mockPlan);
            expect(body.assignments[0].plan_id).toBe('plan-1');
        });

        it('returns assignments with null plan when plan lookup fails', async () => {
            const mockAssignments = [
                {
                    id: 'assign-1',
                    plan_id: 'plan-deleted',
                    user_id: 'user-1',
                    assigned_by_id: 'trainer-1',
                    is_self_assigned: false,
                    start_date: '2026-01-27',
                    end_date: '2026-03-27',
                    is_active: true,
                },
            ];
            (mockedDb.trainingPlanAssignments.getByUser as jest.Mock).mockResolvedValue(mockAssignments);
            (mockedDb.trainingPlans.getById as jest.Mock).mockRejectedValue(new Error('Not found'));

            const req = createRequest('/api/plan-assignments?userId=user-1');
            const res = await GET(req);
            expect(res.status).toBe(200);
            const body = await res.json();
            expect(body.assignments).toHaveLength(1);
            expect(body.assignments[0].plan).toBeNull();
        });

        it('returns empty array when user has no assignments', async () => {
            (mockedDb.trainingPlanAssignments.getByUser as jest.Mock).mockResolvedValue([]);

            const req = createRequest('/api/plan-assignments?userId=user-1');
            const res = await GET(req);
            expect(res.status).toBe(200);
            const body = await res.json();
            expect(body.assignments).toEqual([]);
        });

        it('returns 500 on database error', async () => {
            (mockedDb.trainingPlanAssignments.getByUser as jest.Mock).mockRejectedValue(
                new Error('DB error')
            );

            const req = createRequest('/api/plan-assignments?userId=user-1');
            const res = await GET(req);
            expect(res.status).toBe(500);
        });
    });
});
