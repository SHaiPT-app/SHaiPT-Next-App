/** @jest-environment node */
import { callModel } from '@/lib/ai/gateway';
import { AiLimitError } from '@/lib/ai/gateway';
import { POST } from '@/app/api/ai-coach/workout-summary/route';
import { signIn, signOut, post, modelJson } from '@/test-utils/api';

jest.mock('@/lib/auth', () => jest.requireActual('@/test-utils/api').authMockFactory());
jest.mock('@/lib/ai/gateway', () => jest.requireActual('@/test-utils/api').gatewayMockFactory());
const mockCallModel = callModel as jest.Mock;

const body = {
    sessionName: 'Push Day', durationMinutes: 45, totalVolume: 5000, totalSets: 12, totalReps: 96, weightUnit: 'lbs',
    exercises: [{ name: 'Bench Press', sets: [{ set_number: 1, weight: 135, reps: 8, weight_unit: 'lbs', rpe: 7 }] }],
    prsAchieved: [{ exerciseName: 'Bench Press', weight: 135, reps: 8, unit: 'lbs' }],
    userGoals: ['strength'],
};
const summary = { feedback: 'Solid session.', recommendations: ['a', 'b', 'c'] };

describe('/api/ai-coach/workout-summary', () => {
    beforeEach(() => { jest.clearAllMocks(); signIn(); mockCallModel.mockResolvedValue(modelJson(summary)); });

    it('returns 401 without a user', async () => {
        signOut();
        const res = await POST(post('/api/ai-coach/workout-summary', body));
        expect(res.status).toBe(401);
        expect(mockCallModel).not.toHaveBeenCalled();
    });

    it('returns 400 when sessionName is missing', async () => {
        const res = await POST(post('/api/ai-coach/workout-summary', { ...body, sessionName: '' }));
        expect(res.status).toBe(400);
    });

    it('returns 400 when exercises is empty', async () => {
        const res = await POST(post('/api/ai-coach/workout-summary', { ...body, exercises: [] }));
        expect(res.status).toBe(400);
    });

    it('returns the feedback from one gated workout_summary call with the caller id', async () => {
        const res = await POST(post('/api/ai-coach/workout-summary', body));
        expect(res.status).toBe(200);
        expect(await res.json()).toEqual(summary);
        expect(mockCallModel).toHaveBeenCalledTimes(1);
        const opts = mockCallModel.mock.calls[0][0];
        expect(opts.userId).toBe('u1');
        expect(opts.feature).toBe('workout_summary');
        expect(opts.prompt).toContain('Push Day');
        expect(opts.prompt).toContain('Personal Records');
        expect(opts.schema).toBeDefined();
    });

    it('returns 429 with the gateway message when the limit is hit', async () => {
        mockCallModel.mockRejectedValue(new AiLimitError("You've used today's 40 AI messages.", 'daily_calls'));
        const res = await POST(post('/api/ai-coach/workout-summary', body));
        expect(res.status).toBe(429);
        expect((await res.json()).reason).toBe('daily_calls');
    });
});
