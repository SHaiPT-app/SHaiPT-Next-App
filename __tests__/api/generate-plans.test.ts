/** @jest-environment node */
import { callModel } from '@/lib/ai/gateway';
import { generateTrainingPlan } from '@/lib/ai/plans';
import { POST } from '@/app/api/onboarding/generate-plans/route';
import { signIn, signOut, post, modelJson } from '@/test-utils/api';

jest.mock('@/lib/auth', () => jest.requireActual('@/test-utils/api').authMockFactory());
jest.mock('@/lib/ai/gateway', () => jest.requireActual('@/test-utils/api').gatewayMockFactory());
jest.mock('@/lib/ai/plans', () => ({ ...jest.requireActual('@/lib/ai/plans'), generateTrainingPlan: jest.fn() }));
const mockCallModel = callModel as jest.Mock;
const mockGenerate = generateTrainingPlan as jest.Mock;

const extracted = {
    fitness_goals: ['build muscle'], experience_level: 'intermediate', available_equipment: ['dumbbells'],
    training_days_per_week: 4, injuries_limitations: ['bad knee'], dietary_preferences: ['vegetarian'],
    age: '30', height: '180 cm', weight: '80 kg',
};
const plan = {
    name: 'Dumbbell Upper/Lower', description: 'd', duration_weeks: 4, split_type: 'upper_lower',
    periodization_blocks: [{ phase_type: 'general', phase_duration_weeks: 4, label: 'G' }],
    sessions: [{ name: 'Day 1', description: '', day_number: 1, exercises: [
        { exercise_id: 'Dumbbell_Bench_Press', exercise_name: 'Dumbbell Bench Press', fourd_id: 'bench', primary_muscles: ['chest'], equipment: 'dumbbell', sets: [{ reps: '10', weight: 'moderate', rest_seconds: 90 }], notes: '' },
    ] }],
};
const messages = [
    { role: 'assistant', content: 'What are your goals?' },
    { role: 'user', content: 'Build muscle, I have dumbbells, 4 days a week, bad knee, vegetarian' },
];

describe('POST /api/onboarding/generate-plans', () => {
    let supabase: ReturnType<typeof signIn>;
    beforeEach(() => {
        jest.clearAllMocks();
        supabase = signIn({ profiles: { id: 'u1', weight_kg: 80, height_cm: 180, gender: 'male', date_of_birth: '1996-01-01' } });
        mockCallModel.mockResolvedValue(modelJson(extracted));
        mockGenerate.mockResolvedValue({ plan, cached: false, mocked: false, usage: { inputTokens: 0, outputTokens: 0, cachedTokens: 0, costUsd: 0 } });
    });

    it('returns 401 without a user (userId in the body is ignored)', async () => {
        signOut();
        expect((await POST(post('/api/onboarding/generate-plans', { messages, userId: 'x' }))).status).toBe(401);
    });

    it('returns 400 without messages', async () => {
        expect((await POST(post('/api/onboarding/generate-plans', { messages: [] }))).status).toBe(400);
    });

    it('extracts the profile, generates the plan from the library, computes macros and saves onboarding', async () => {
        const res = await POST(post('/api/onboarding/generate-plans', { messages }));
        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json.success).toBe(true);
        expect(json.data.extracted_profile).toEqual(extracted);
        expect(json.data.training_plan.name).toBe('Dumbbell Upper/Lower');
        expect(json.data.training_plan.sessions[0].week_number).toBe(1);
        expect(json.data.training_plan.sessions[0].exercises[0].fourd_id).toBe('bench');
        expect(json.data.nutrition_plan.daily_calories).toBeGreaterThan(2000);
        expect(json.data.nutrition_plan.macros.protein_g).toBeGreaterThan(100);
        expect(json.data.nutrition_plan.meal_plan).toEqual([]);

        // one cheap extraction call, then the plan generator with the extracted fields
        expect(mockCallModel).toHaveBeenCalledTimes(1);
        expect(mockCallModel.mock.calls[0][0].feature).toBe('interview');
        expect(mockCallModel.mock.calls[0][0].prompt).toContain('Build muscle');
        const profile = mockGenerate.mock.calls[0][0].profile;
        expect(profile.trainingDays).toBe(4);
        expect(profile.injuries).toBe('bad knee');
        expect(profile.equipment).toBe('dumbbells');

        // the onboarding row and the profile flag are written as the caller
        const inserted = supabase.ops.find((o) => o.table === 'onboarding' && o.method === 'insert');
        expect(inserted).toBeDefined();
        expect((inserted!.args[0] as { dietary_preferences: string[] }).dietary_preferences).toEqual(['vegetarian']);
        const flagged = supabase.ops.find((o) => o.table === 'profiles' && o.method === 'update');
        expect((flagged!.args[0] as { onboarding_completed: boolean }).onboarding_completed).toBe(true);
    });

    it('returns 500 with a message when generation fails', async () => {
        mockGenerate.mockRejectedValue(new Error('library empty'));
        const res = await POST(post('/api/onboarding/generate-plans', { messages }));
        expect(res.status).toBe(500);
        expect((await res.json()).error).toBe('library empty');
    });
});
