/** @jest-environment node */
import { generateTrainingPlan, recommendSplits } from '@/lib/ai/plans';
import { AiLimitError } from '@/lib/ai/gateway';
import { POST } from '@/app/api/ai-coach/generate-plan/route';
import { signIn, signOut, post } from '@/test-utils/api';

jest.mock('@/lib/auth', () => jest.requireActual('@/test-utils/api').authMockFactory());
jest.mock('@/lib/ai/plans', () => ({ ...jest.requireActual('@/lib/ai/plans'), generateTrainingPlan: jest.fn(), recommendSplits: jest.fn() }));
const mockGenerate = generateTrainingPlan as jest.Mock;
const mockSplits = recommendSplits as jest.Mock;

const intakeData = {
    name: 'T', age: '30', height: '180 cm', weight: '80 kg', sport_history: 'football', training_duration: '3-5 years',
    training_style: 'strength', fitness_goals: 'get stronger', training_days_per_week: '4', session_duration: '60 min',
    preferred_time: 'morning', available_equipment: 'full gym', training_location: 'Commercial Gym', injuries: 'none',
    medical_considerations: '', fitness_level: 'Intermediate',
};
const splits = [
    { id: 'upper_lower', name: 'Upper/Lower', description: 'x', days_per_week: 4, recommended: true },
    { id: 'ppl', name: 'PPL', description: 'y', days_per_week: 4, recommended: false },
];
const plan = {
    name: 'Upper/Lower Program', description: 'd', duration_weeks: 8, split_type: 'upper_lower',
    periodization_blocks: [{ phase_type: 'hypertrophy', phase_duration_weeks: 8, label: 'H' }],
    sessions: [{ name: 'Upper A', description: '', day_number: 1, exercises: [
        { exercise_id: 'Barbell_Bench_Press_-_Medium_Grip', exercise_name: 'Barbell Bench Press - Medium Grip', fourd_id: 'bench', primary_muscles: ['chest'], equipment: 'barbell', sets: [{ reps: '8', weight: 'moderate', rest_seconds: 90 }], notes: 'n' },
    ] }],
};

describe('Generate Plan API Route', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        signIn();
        mockSplits.mockResolvedValue({ splits, cached: false, mocked: false });
        mockGenerate.mockResolvedValue({ plan, cached: false, mocked: false, usage: { inputTokens: 0, outputTokens: 0, cachedTokens: 0, costUsd: 0 } });
    });

    it('returns 401 without a user', async () => {
        signOut();
        expect((await POST(post('/api/ai-coach/generate-plan', { action: 'recommend_splits', intakeData }))).status).toBe(401);
    });

    describe('recommend_splits action', () => {
        it('returns the ranked splits for the caller, built from the intake', async () => {
            const res = await POST(post('/api/ai-coach/generate-plan', { action: 'recommend_splits', intakeData, messages: [{ role: 'user', content: 'I can do 4 days' }] }));
            expect(res.status).toBe(200);
            expect((await res.json()).splits).toEqual(splits);
            const opts = mockSplits.mock.calls[0][0];
            expect(opts.userId).toBe('u1');
            expect(opts.profile.trainingDays).toBe(4);
            expect(opts.profile.location).toBe('Commercial Gym');
            expect(opts.profile.extra).toContain('I can do 4 days');
            expect(mockGenerate).not.toHaveBeenCalled();
        });
    });

    describe('plan generation', () => {
        it('returns 400 without a splitType', async () => {
            expect((await POST(post('/api/ai-coach/generate-plan', { intakeData }))).status).toBe(400);
        });

        it('returns the plan with library ids and the 4D link per exercise', async () => {
            const res = await POST(post('/api/ai-coach/generate-plan', { splitType: 'upper_lower', intakeData }));
            expect(res.status).toBe(200);
            const json = await res.json();
            expect(json.plan.sessions[0].exercises[0].fourd_id).toBe('bench');
            expect(json.plan.sessions[0].exercises[0].exercise_id).toBe('Barbell_Bench_Press_-_Medium_Grip');
            expect(mockGenerate.mock.calls[0][0].profile.splitType).toBe('upper_lower');
        });

        it('passes the tester flag through to the gateway', async () => {
            signIn({}, { tester: true });
            await POST(post('/api/ai-coach/generate-plan', { splitType: 'ppl', intakeData }));
            expect(mockGenerate.mock.calls[0][0].tester).toBe(true);
        });

        it('returns 429 when a limit is hit', async () => {
            mockGenerate.mockRejectedValue(new AiLimitError('Daily limit', 'daily_calls'));
            expect((await POST(post('/api/ai-coach/generate-plan', { splitType: 'ppl', intakeData }))).status).toBe(429);
        });
    });
});
