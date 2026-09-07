/** @jest-environment node */
import { callModel } from '@/lib/ai/gateway';
import { POST } from '@/app/api/ai-coach/weekly-insights/route';
import { signIn, signOut, post, modelJson } from '@/test-utils/api';

jest.mock('@/lib/auth', () => jest.requireActual('@/test-utils/api').authMockFactory());
jest.mock('@/lib/ai/gateway', () => jest.requireActual('@/test-utils/api').gatewayMockFactory());
const mockCallModel = callModel as jest.Mock;

const insight = {
    adherence: { planned_workouts: 4, completed_workouts: 2, adherence_percentage: 50, summary: 'Half.' },
    strength_trends: { trending_up: ['Bench Press'], trending_down: [], summary: 'Up.' },
    plateaus: { exercises: [], summary: 'None.' },
    recommendations: ['a', 'b', 'c'],
    overall_summary: 'Fine.',
};
const body = {
    workoutLogs: [
        { date: '2026-09-01', exercises: [{ name: 'Bench Press', sets: [{ weight: 135, reps: 8, weight_unit: 'lbs' }] }] },
        { date: '2026-09-03', exercises: [{ name: 'Bench Press', sets: [{ weight: 140, reps: 8, weight_unit: 'lbs' }] }] },
    ],
    plannedWorkouts: 4,
    previousWeekData: { exercises: [{ name: 'Bench Press', maxWeight: 130, totalVolume: 2000 }] },
    userGoals: ['strength'],
};

describe('POST /api/ai-coach/weekly-insights', () => {
    beforeEach(() => { jest.clearAllMocks(); signIn(); mockCallModel.mockResolvedValue(modelJson(insight)); });

    it('returns 401 without a user (the caller comes from the token, not the body)', async () => {
        signOut();
        const res = await POST(post('/api/ai-coach/weekly-insights', { ...body, userId: 'someone-else' }));
        expect(res.status).toBe(401);
    });

    it('returns the insight for the week with the caller id and the week bounds', async () => {
        const res = await POST(post('/api/ai-coach/weekly-insights', body));
        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json.user_id).toBe('u1');
        expect(json.week_start).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(json.adherence.completed_workouts).toBe(2);
        expect(json.strength_trends.trending_up).toEqual(['Bench Press']);
        expect(json.recommendations).toHaveLength(3);
        const opts = mockCallModel.mock.calls[0][0];
        expect(opts.feature).toBe('weekly_insights');
        expect(opts.prompt).toContain('Bench Press: Max 140');
        expect(opts.prompt).toContain('weight +10');
    });

    it('marks cached responses', async () => {
        mockCallModel.mockResolvedValue(modelJson(insight, { cached: true }));
        const json = await (await POST(post('/api/ai-coach/weekly-insights', body))).json();
        expect(json.cached).toBe(true);
    });

    it('returns 500 with a message on an unexpected failure', async () => {
        mockCallModel.mockRejectedValue(new Error('boom'));
        const res = await POST(post('/api/ai-coach/weekly-insights', body));
        expect(res.status).toBe(500);
        expect((await res.json()).error).toBe('boom');
    });
});
