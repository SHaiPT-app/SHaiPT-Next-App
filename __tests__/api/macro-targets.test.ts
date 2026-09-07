/** @jest-environment node */
import { POST } from '@/app/api/nutrition/macro-targets/route';
import { signIn, signOut, post } from '@/test-utils/api';

jest.mock('@/lib/auth', () => jest.requireActual('@/test-utils/api').authMockFactory());

const PROFILE = { id: 'u1', weight_kg: 80, height_cm: 180, date_of_birth: '1996-01-01', gender: 'male', fitness_goals: ['muscle_gain'] };

describe('/api/nutrition/macro-targets POST', () => {
    beforeEach(() => jest.clearAllMocks());

    it('returns 401 without a user (userId in the body is ignored)', async () => {
        signOut();
        expect((await POST(post('/api/nutrition/macro-targets', { userId: 'x' }))).status).toBe(401);
    });

    it('returns 404 when the caller has no profile row', async () => {
        signIn({ profiles: null });
        expect((await POST(post('/api/nutrition/macro-targets', {}))).status).toBe(404);
    });

    it('computes targets from the profile without calling any model', async () => {
        signIn({ profiles: PROFILE, training_plan_assignments: null, onboarding: null });
        const res = await POST(post('/api/nutrition/macro-targets', {}));
        expect(res.status).toBe(200);
        const { targets } = await res.json();
        // Mifflin-St Jeor: 10*80 + 6.25*180 - 5*30 + 5 = 1780; * 1.55 = 2759; muscle gain → *1.15 ≈ 3173
        expect(targets.daily_calories).toBeGreaterThan(2900);
        expect(targets.daily_calories).toBeLessThan(3400);
        expect(targets.protein_g).toBeGreaterThan(100);
        expect(targets.training_phase).toBe('general');
        expect(typeof targets.rationale).toBe('string');
    });

    it('uses the active plan phase and the onboarding diet preferences', async () => {
        signIn({
            profiles: PROFILE,
            training_plan_assignments: { plan_id: 'p1', training_plans: { phase_type: 'strength' } },
            onboarding: { dietary_preferences: ['keto'] },
        });
        const { targets } = await (await POST(post('/api/nutrition/macro-targets', {}))).json();
        expect(targets.training_phase).toBe('strength');
        // keto: carbs are a sliver of calories
        expect(targets.carbs_g * 4).toBeLessThan(targets.daily_calories * 0.15);
    });
});
