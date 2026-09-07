/** @jest-environment node */
import { generateMealPlan } from '@/lib/ai/nutrition';
import { AiLimitError } from '@/lib/ai/gateway';
import { POST } from '@/app/api/ai-coach/generate-nutrition-plan/route';
import { signIn, signOut, post } from '@/test-utils/api';

jest.mock('@/lib/auth', () => jest.requireActual('@/test-utils/api').authMockFactory());
jest.mock('@/lib/ai/nutrition', () => ({ ...jest.requireActual('@/lib/ai/nutrition'), generateMealPlan: jest.fn() }));
const mockGenerate = generateMealPlan as jest.Mock;

const intakeData = { name: 'T', age: '30', height: '180 cm', weight: '80 kg', fitness_goals: 'build muscle', fitness_level: 'intermediate', training_days_per_week: '4' };
const dietIntakeData = { allergies: 'nuts', dietary_preferences: 'Mediterranean', foods_loved: 'fish', foods_hated: 'liver', meals_per_day: '4' };
const plan = { name: 'Mediterranean 4-day', dietary_preferences: ['Mediterranean'], plan_overview: { daily_calories: 2800 }, daily_schedule: [], shopping_list: [], nutrition_tips: [] };

describe('/api/ai-coach/generate-nutrition-plan', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        signIn({ profiles: { id: 'u1', weight_kg: 80, height_cm: 180 } });
        mockGenerate.mockResolvedValue({ plan, targets: { daily_calories: 2800 }, cached: false, mocked: false });
    });

    it('returns 401 without a user', async () => {
        signOut();
        expect((await POST(post('/api/ai-coach/generate-nutrition-plan', { intakeData, dietIntakeData }))).status).toBe(401);
    });

    it('returns 400 when diet intake data is missing', async () => {
        expect((await POST(post('/api/ai-coach/generate-nutrition-plan', { intakeData }))).status).toBe(400);
    });

    it('returns 400 when training intake data is missing', async () => {
        expect((await POST(post('/api/ai-coach/generate-nutrition-plan', { dietIntakeData }))).status).toBe(400);
    });

    it('returns the generated plan built from both intakes for the caller', async () => {
        const res = await POST(post('/api/ai-coach/generate-nutrition-plan', { intakeData, dietIntakeData, messages: [{ role: 'user', content: 'I train mornings' }] }));
        expect(res.status).toBe(200);
        const json = await res.json();
        expect(json.plan.name).toBe('Mediterranean 4-day');
        const opts = mockGenerate.mock.calls[0][0];
        expect(opts.userId).toBe('u1');
        expect(opts.input.allergies).toContain('nuts');
        expect(opts.input.weightKg).toBe(80);
        expect(opts.input.notes).toContain('I train mornings');
    });

    it('returns 429 when the gateway refuses', async () => {
        mockGenerate.mockRejectedValue(new AiLimitError('Budget spent', 'monthly_budget'));
        expect((await POST(post('/api/ai-coach/generate-nutrition-plan', { intakeData, dietIntakeData }))).status).toBe(429);
    });
});
