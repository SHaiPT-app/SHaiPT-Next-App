/** @jest-environment node */
import { callModel, AiLimitError } from '@/lib/ai/gateway';
import { POST } from '@/app/api/ai-coach/plan-adaptation/route';
import { signIn, signOut, post, modelJson } from '@/test-utils/api';

jest.mock('@/lib/auth', () => jest.requireActual('@/test-utils/api').authMockFactory());
jest.mock('@/lib/ai/gateway', () => jest.requireActual('@/test-utils/api').gatewayMockFactory());
const mockCallModel = callModel as jest.Mock;

const body = {
    workoutLogId: 'log-1', sessionName: 'Upper A',
    exercises: [{ exercise_name: 'Bench Press', target_sets: 3, target_reps: '8', target_weight: '135 lbs',
        actual_sets: [{ weight: 135, reps: 8, rpe: 6, weight_unit: 'lbs' }], pain_reported: true, pain_notes: 'shoulder' }],
    userGoals: ['strength'], currentPhaseType: 'hypertrophy', weekNumber: 2, totalPlanWeeks: 8,
};
const adaptation = {
    summary: 'Progressing.',
    recommendations: [{ type: 'weight_progression', exercise_name: 'Bench Press', current_value: '135', recommended_value: '140', rationale: 'RPE 6', substitute_exercise_name: null }],
    overall_assessment: 'Good.',
};

describe('/api/ai-coach/plan-adaptation', () => {
    beforeEach(() => { jest.clearAllMocks(); signIn(); mockCallModel.mockResolvedValue(modelJson(adaptation)); });

    it('returns 401 without a user', async () => {
        signOut();
        expect((await POST(post('/api/ai-coach/plan-adaptation', body))).status).toBe(401);
    });

    it('returns 400 when sessionName is missing', async () => {
        expect((await POST(post('/api/ai-coach/plan-adaptation', { ...body, sessionName: '' }))).status).toBe(400);
    });

    it('returns 400 when exercises is empty', async () => {
        expect((await POST(post('/api/ai-coach/plan-adaptation', { ...body, exercises: [] }))).status).toBe(400);
    });

    it('returns the recommendations from one gated plan_adaptation call, pain in the prompt', async () => {
        const res = await POST(post('/api/ai-coach/plan-adaptation', body));
        expect(res.status).toBe(200);
        expect(await res.json()).toEqual(adaptation);
        const opts = mockCallModel.mock.calls[0][0];
        expect(opts.feature).toBe('plan_adaptation');
        expect(opts.userId).toBe('u1');
        expect(opts.prompt).toContain('USER REPORTED PAIN: shoulder');
        expect(opts.prompt).toContain('Week 2 of 8');
    });

    it('returns 429 when the monthly budget is spent', async () => {
        mockCallModel.mockRejectedValue(new AiLimitError('Budget spent', 'monthly_budget'));
        expect((await POST(post('/api/ai-coach/plan-adaptation', body))).status).toBe(429);
    });
});
