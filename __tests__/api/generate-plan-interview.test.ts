/**
 * @jest-environment node
 */

jest.mock('@google/generative-ai', () => ({
    GoogleGenerativeAI: jest.fn(),
}));

jest.mock('@/lib/supabaseDb', () => ({
    db: {},
}));

jest.mock('@/lib/supabase', () => ({
    supabase: {},
}));

import { POST } from '@/app/api/ai-coach/generate-plan/route';
import { NextRequest } from 'next/server';

function createRequest(body: object): NextRequest {
    return new NextRequest('http://localhost:3000/api/ai-coach/generate-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
}

describe('Generate Plan API Route', () => {
    const originalEnv = process.env;

    beforeEach(() => {
        jest.clearAllMocks();
        process.env = { ...originalEnv };
        delete process.env.GEMINI_API_KEY;
    });

    afterAll(() => {
        process.env = originalEnv;
    });

    describe('recommend_splits action', () => {
        it('returns mock split recommendations when no API key is set', async () => {
            const req = createRequest({
                action: 'recommend_splits',
                intakeData: {
                    training_days_per_week: '4',
                    fitness_goals: 'Build muscle',
                    fitness_level: 'intermediate',
                },
            });

            const res = await POST(req);
            expect(res.status).toBe(200);

            const data = await res.json();
            expect(data.splits).toBeDefined();
            expect(Array.isArray(data.splits)).toBe(true);
            expect(data.splits.length).toBeGreaterThan(0);

            // Check split structure
            const split = data.splits[0];
            expect(split).toHaveProperty('id');
            expect(split).toHaveProperty('name');
            expect(split).toHaveProperty('description');
            expect(split).toHaveProperty('days_per_week');
            expect(split).toHaveProperty('recommended');
        });

        it('returns upper_lower as recommended for 4-day training', async () => {
            const req = createRequest({
                action: 'recommend_splits',
                intakeData: { training_days_per_week: '4' },
            });

            const res = await POST(req);
            const data = await res.json();

            const recommended = data.splits.find((s: { recommended: boolean }) => s.recommended);
            expect(recommended).toBeDefined();
            expect(recommended.id).toBe('upper_lower');
        });

        it('returns full_body as recommended for 3-day training', async () => {
            const req = createRequest({
                action: 'recommend_splits',
                intakeData: { training_days_per_week: '3' },
            });

            const res = await POST(req);
            const data = await res.json();

            const recommended = data.splits.find((s: { recommended: boolean }) => s.recommended);
            expect(recommended).toBeDefined();
            expect(recommended.id).toBe('full_body');
        });

        it('returns ppl as recommended for 5+ day training', async () => {
            const req = createRequest({
                action: 'recommend_splits',
                intakeData: { training_days_per_week: '5' },
            });

            const res = await POST(req);
            const data = await res.json();

            const recommended = data.splits.find((s: { recommended: boolean }) => s.recommended);
            expect(recommended).toBeDefined();
            expect(recommended.id).toBe('ppl');
        });
    });

    describe('plan generation', () => {
        it('returns 400 when splitType is missing', async () => {
            const req = createRequest({
                messages: [{ role: 'user', content: 'test' }],
                intakeData: {},
            });

            const res = await POST(req);
            expect(res.status).toBe(400);

            const data = await res.json();
            expect(data.error).toContain('splitType is required');
        });

        it('returns mock plan when no API key is set', async () => {
            const req = createRequest({
                splitType: 'ppl',
                intakeData: {
                    training_days_per_week: '4',
                    fitness_goals: 'Build muscle',
                },
            });

            const res = await POST(req);
            expect(res.status).toBe(200);

            const data = await res.json();
            expect(data.plan).toBeDefined();
            expect(data.plan.name).toBeDefined();
            expect(data.plan.description).toBeDefined();
            expect(data.plan.duration_weeks).toBe(8);
            expect(data.plan.split_type).toBe('ppl');
        });

        it('returns plan with correct number of sessions', async () => {
            const req = createRequest({
                splitType: 'upper_lower',
                intakeData: { training_days_per_week: '4' },
            });

            const res = await POST(req);
            const data = await res.json();

            expect(data.plan.sessions).toHaveLength(4);
            expect(data.plan.sessions[0].day_number).toBe(1);
            expect(data.plan.sessions[3].day_number).toBe(4);
        });

        it('returns plan with periodization blocks', async () => {
            const req = createRequest({
                splitType: 'full_body',
                intakeData: { training_days_per_week: '3' },
            });

            const res = await POST(req);
            const data = await res.json();

            expect(data.plan.periodization_blocks).toBeDefined();
            expect(data.plan.periodization_blocks.length).toBeGreaterThan(0);

            const block = data.plan.periodization_blocks[0];
            expect(block).toHaveProperty('phase_type');
            expect(block).toHaveProperty('phase_duration_weeks');
            expect(block).toHaveProperty('label');
        });

        it('returns plan with exercises in each session', async () => {
            const req = createRequest({
                splitType: 'ppl',
                intakeData: { training_days_per_week: '3' },
            });

            const res = await POST(req);
            const data = await res.json();

            for (const session of data.plan.sessions) {
                expect(session.exercises).toBeDefined();
                expect(session.exercises.length).toBeGreaterThan(0);

                const exercise = session.exercises[0];
                expect(exercise).toHaveProperty('exercise_name');
                expect(exercise).toHaveProperty('sets');
                expect(exercise).toHaveProperty('notes');

                expect(exercise.sets.length).toBeGreaterThan(0);
                const set = exercise.sets[0];
                expect(set).toHaveProperty('reps');
                expect(set).toHaveProperty('weight');
                expect(set).toHaveProperty('rest_seconds');
            }
        });
    });
});
