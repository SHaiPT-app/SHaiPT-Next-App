/**
 * @jest-environment node
 */
import { POST } from '@/app/api/ai-coach/weekly-insights/route';
import { NextRequest } from 'next/server';

// Mock GoogleGenerativeAI
jest.mock('@google/generative-ai', () => ({
    GoogleGenerativeAI: jest.fn(),
}));

function createRequest(body: Record<string, unknown>): NextRequest {
    return new NextRequest('http://localhost:3000/api/ai-coach/weekly-insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
}

describe('POST /api/ai-coach/weekly-insights', () => {
    const originalEnv = process.env;

    beforeEach(() => {
        process.env = { ...originalEnv };
        delete process.env.GEMINI_API_KEY;
    });

    afterAll(() => {
        process.env = originalEnv;
    });

    it('returns 400 if userId is missing', async () => {
        const req = createRequest({ workoutLogs: [] });
        const res = await POST(req);

        expect(res.status).toBe(400);
        const data = await res.json();
        expect(data.error).toBe('User ID is required');
    });

    it('returns mock insight when no API key is configured', async () => {
        const req = createRequest({
            userId: 'user-1',
            workoutLogs: [
                {
                    date: '2025-01-22',
                    exercises: [
                        {
                            name: 'Bench Press',
                            sets: [{ weight: 185, reps: 5, weight_unit: 'lbs' }],
                        },
                    ],
                },
            ],
            plannedWorkouts: 4,
        });

        const res = await POST(req);
        expect(res.status).toBe(200);

        const data = await res.json();
        expect(data.user_id).toBe('user-1');
        expect(data.week_start).toBeDefined();
        expect(data.week_end).toBeDefined();
        expect(data.adherence).toBeDefined();
        expect(data.adherence.planned_workouts).toBe(4);
        expect(data.adherence.completed_workouts).toBe(3);
        expect(data.strength_trends).toBeDefined();
        expect(Array.isArray(data.strength_trends.trending_up)).toBe(true);
        expect(data.plateaus).toBeDefined();
        expect(Array.isArray(data.recommendations)).toBe(true);
        expect(data.recommendations.length).toBe(3);
        expect(data.overall_summary).toBeDefined();
        expect(data.generated_at).toBeDefined();
    });

    it('returns mock insight with empty workout logs', async () => {
        const req = createRequest({
            userId: 'user-2',
            workoutLogs: [],
        });

        const res = await POST(req);
        expect(res.status).toBe(200);

        const data = await res.json();
        expect(data.user_id).toBe('user-2');
        expect(data.adherence).toBeDefined();
    });

    it('returns mock insight with default planned workouts', async () => {
        const req = createRequest({
            userId: 'user-3',
            workoutLogs: [
                {
                    date: '2025-01-20',
                    exercises: [
                        {
                            name: 'Squat',
                            sets: [
                                { weight: 225, reps: 5, weight_unit: 'lbs' },
                                { weight: 225, reps: 5, weight_unit: 'lbs' },
                            ],
                        },
                    ],
                },
            ],
        });

        const res = await POST(req);
        expect(res.status).toBe(200);

        const data = await res.json();
        expect(data.user_id).toBe('user-3');
        expect(data.id).toMatch(/^insight-/);
    });

    it('aggregates duplicate exercises across workouts', async () => {
        const req = createRequest({
            userId: 'user-4',
            workoutLogs: [
                {
                    date: '2025-01-20',
                    exercises: [
                        {
                            name: 'Bench Press',
                            sets: [{ weight: 185, reps: 5, weight_unit: 'lbs' }],
                        },
                    ],
                },
                {
                    date: '2025-01-22',
                    exercises: [
                        {
                            name: 'Bench Press',
                            sets: [{ weight: 190, reps: 5, weight_unit: 'lbs' }],
                        },
                    ],
                },
            ],
        });

        const res = await POST(req);
        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data).toBeDefined();
    });

    it('handles previous week comparison data', async () => {
        const req = createRequest({
            userId: 'user-5',
            workoutLogs: [
                {
                    date: '2025-01-22',
                    exercises: [
                        {
                            name: 'Bench Press',
                            sets: [{ weight: 190, reps: 5, weight_unit: 'lbs' }],
                        },
                    ],
                },
            ],
            previousWeekData: {
                exercises: [
                    { name: 'Bench Press', maxWeight: 185, totalVolume: 4625 },
                ],
            },
        });

        const res = await POST(req);
        expect(res.status).toBe(200);
    });
});
