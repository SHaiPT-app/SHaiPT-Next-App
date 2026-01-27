/**
 * @jest-environment node
 */

const mockGetById = jest.fn();
const mockGetActiveByUser = jest.fn();
const mockGetPlanById = jest.fn();
const mockGenerateContent = jest.fn();

jest.mock('@/lib/supabaseDb', () => ({
    db: {
        profiles: {
            getById: (...args: unknown[]) => mockGetById(...args),
        },
        trainingPlanAssignments: {
            getActiveByUser: (...args: unknown[]) => mockGetActiveByUser(...args),
        },
        trainingPlans: {
            getById: (...args: unknown[]) => mockGetPlanById(...args),
        },
    },
}));

jest.mock('@/lib/supabase', () => ({
    supabase: {
        from: () => ({
            select: () => ({
                eq: () => ({
                    order: () => ({
                        limit: () => ({
                            single: () => Promise.resolve({ data: null, error: null }),
                        }),
                    }),
                }),
            }),
        }),
    },
}));

jest.mock('@google/generative-ai', () => ({
    GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
        getGenerativeModel: () => ({
            generateContent: (...args: unknown[]) => mockGenerateContent(...args),
        }),
    })),
}));

import { POST } from '@/app/api/nutrition/macro-targets/route';

function createRequest(url: string, options?: RequestInit) {
    return new Request(url, options);
}

describe('/api/nutrition/macro-targets POST', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('returns 400 when userId is missing', async () => {
        const req = createRequest('http://localhost/api/nutrition/macro-targets', {
            method: 'POST',
            body: JSON.stringify({}),
        });
        const res = await POST(req as any);
        const data = await res.json();
        expect(res.status).toBe(400);
        expect(data.error).toBe('userId is required');
    });

    it('returns 404 when user profile is not found', async () => {
        mockGetById.mockResolvedValue(null);

        const req = createRequest('http://localhost/api/nutrition/macro-targets', {
            method: 'POST',
            body: JSON.stringify({ userId: 'nonexistent' }),
        });
        const res = await POST(req as any);
        const data = await res.json();
        expect(res.status).toBe(404);
        expect(data.error).toBe('User profile not found');
    });

    it('returns AI-generated macro targets', async () => {
        mockGetById.mockResolvedValue({
            id: 'user-1',
            email: 'test@test.com',
            weight_kg: 80,
            height_cm: 180,
            gender: 'male',
            date_of_birth: '1995-01-01',
            fitness_goals: ['muscle_gain'],
        });
        mockGetActiveByUser.mockResolvedValue(null);

        const mockTargets = {
            daily_calories: 2800,
            protein_g: 210,
            carbs_g: 315,
            fat_g: 78,
            training_phase: 'general',
            rationale: 'Targets for muscle gain.',
        };
        mockGenerateContent.mockResolvedValue({
            response: { text: () => JSON.stringify(mockTargets) },
        });

        const req = createRequest('http://localhost/api/nutrition/macro-targets', {
            method: 'POST',
            body: JSON.stringify({ userId: 'user-1' }),
        });
        const res = await POST(req as any);
        const data = await res.json();

        expect(res.status).toBe(200);
        expect(data.targets).toBeDefined();
        expect(data.targets.daily_calories).toBe(2800);
        expect(data.targets.protein_g).toBe(210);
        expect(data.targets.carbs_g).toBe(315);
        expect(data.targets.fat_g).toBe(78);
    }, 15000);

    it('includes training phase context from active plan', async () => {
        mockGetById.mockResolvedValue({
            id: 'user-1',
            email: 'test@test.com',
            weight_kg: 80,
            height_cm: 180,
            gender: 'male',
            fitness_goals: ['muscle_gain'],
        });
        mockGetActiveByUser.mockResolvedValue({ plan_id: 'plan-1' });
        mockGetPlanById.mockResolvedValue({ id: 'plan-1', phase_type: 'strength' });

        const mockTargets = {
            daily_calories: 2800,
            protein_g: 245,
            carbs_g: 280,
            fat_g: 78,
            training_phase: 'strength',
            rationale: 'Targets for strength phase.',
        };
        mockGenerateContent.mockResolvedValue({
            response: { text: () => JSON.stringify(mockTargets) },
        });

        const req = createRequest('http://localhost/api/nutrition/macro-targets', {
            method: 'POST',
            body: JSON.stringify({ userId: 'user-1' }),
        });
        const res = await POST(req as any);
        const data = await res.json();

        expect(res.status).toBe(200);
        expect(data.targets.training_phase).toBe('strength');
    }, 15000);

    it('returns 500 on unexpected error', async () => {
        mockGetById.mockRejectedValue(new Error('DB error'));

        const req = createRequest('http://localhost/api/nutrition/macro-targets', {
            method: 'POST',
            body: JSON.stringify({ userId: 'user-1' }),
        });
        const res = await POST(req as any);
        const data = await res.json();

        expect(res.status).toBe(500);
        expect(data.error).toBe('Failed to generate macro targets');
    });
});
