/**
 * @jest-environment node
 */

/**
 * Tests for the generate-nutrition-plan API route
 */

// Mock Google Generative AI
jest.mock('@google/generative-ai', () => ({
    GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
        getGenerativeModel: jest.fn().mockReturnValue({
            generateContent: jest.fn().mockResolvedValue({
                response: {
                    text: () => JSON.stringify({
                        name: 'Test Nutrition Plan',
                        dietary_preferences: ['Mediterranean'],
                        plan_overview: {
                            duration_days: 7,
                            daily_calories: 2400,
                            macros: { calories: 2400, protein_g: 180, carbs_g: 260, fat_g: 75 },
                            key_principles: ['Eat protein at every meal'],
                        },
                        daily_schedule: {
                            day_1: {
                                breakfast: {
                                    name: 'Oats',
                                    ingredients: ['oats', 'milk'],
                                    instructions: 'Cook oats',
                                    prep_time_minutes: 10,
                                    nutrition: { calories: 400, protein_g: 20, carbs_g: 50, fat_g: 10 },
                                },
                                lunch: {
                                    name: 'Chicken salad',
                                    ingredients: ['chicken', 'salad'],
                                    instructions: 'Grill chicken, serve with salad',
                                    prep_time_minutes: 20,
                                    nutrition: { calories: 600, protein_g: 45, carbs_g: 40, fat_g: 20 },
                                },
                                dinner: {
                                    name: 'Salmon',
                                    ingredients: ['salmon', 'rice'],
                                    instructions: 'Bake salmon, serve with rice',
                                    prep_time_minutes: 25,
                                    nutrition: { calories: 600, protein_g: 40, carbs_g: 50, fat_g: 22 },
                                },
                            },
                        },
                        shopping_list: {
                            proteins: ['chicken', 'salmon'],
                            vegetables: ['lettuce'],
                        },
                        nutrition_tips: ['Drink water'],
                    }),
                },
            }),
        }),
    })),
}));

import { POST } from '@/app/api/ai-coach/generate-nutrition-plan/route';
import { NextRequest } from 'next/server';

function createRequest(body: Record<string, unknown>): NextRequest {
    return new NextRequest('http://localhost:3000/api/ai-coach/generate-nutrition-plan', {
        method: 'POST',
        body: JSON.stringify(body),
        headers: { 'Content-Type': 'application/json' },
    });
}

const mockIntakeData = {
    name: 'Test User',
    age: '25',
    height: '180cm',
    weight: '80kg',
    sport_history: 'Weightlifting',
    training_duration: '2 years',
    training_style: 'Hypertrophy',
    fitness_goals: 'Build muscle',
    training_days_per_week: '4',
    session_duration: '60 min',
    preferred_time: 'Morning',
    available_equipment: 'Full gym',
    training_location: 'Commercial gym',
    injuries: 'None',
    medical_considerations: 'None',
    fitness_level: 'Intermediate',
};

const mockDietIntakeData = {
    allergies: 'Peanuts',
    intolerances: 'Lactose',
    diet_style: 'Mediterranean',
    foods_love: 'Chicken, Rice, Salmon',
    foods_hate: 'Liver, Brussels sprouts',
    medical_dietary_considerations: 'None',
    meals_per_day: '4',
    cooking_preferences: 'Meal prep on weekends',
};

describe('/api/ai-coach/generate-nutrition-plan', () => {
    const originalEnv = process.env;

    beforeEach(() => {
        jest.resetModules();
        process.env = { ...originalEnv };
    });

    afterAll(() => {
        process.env = originalEnv;
    });

    it('returns 400 when diet intake data is missing', async () => {
        const req = createRequest({
            intakeData: mockIntakeData,
        });

        const res = await POST(req);
        expect(res.status).toBe(400);
        const data = await res.json();
        expect(data.error).toContain('required');
    });

    it('returns 400 when training intake data is missing', async () => {
        const req = createRequest({
            dietIntakeData: mockDietIntakeData,
        });

        const res = await POST(req);
        expect(res.status).toBe(400);
        const data = await res.json();
        expect(data.error).toContain('required');
    });

    it('returns mock plan when no API key', async () => {
        delete process.env.GEMINI_API_KEY;

        const req = createRequest({
            messages: [],
            dietIntakeData: mockDietIntakeData,
            intakeData: mockIntakeData,
        });

        const res = await POST(req);
        expect(res.status).toBe(200);

        const data = await res.json();
        expect(data.plan).toBeDefined();
        expect(data.plan.name).toBe('Performance Fuel Plan');
        expect(data.plan.plan_overview).toBeDefined();
        expect(data.plan.plan_overview.daily_calories).toBe(2400);
        expect(data.plan.daily_schedule).toBeDefined();
        expect(data.plan.shopping_list).toBeDefined();
        expect(data.plan.nutrition_tips).toBeDefined();
    });

    it('returns mock plan with correct structure', async () => {
        delete process.env.GEMINI_API_KEY;

        const req = createRequest({
            messages: [],
            dietIntakeData: mockDietIntakeData,
            intakeData: mockIntakeData,
        });

        const res = await POST(req);
        const data = await res.json();
        const plan = data.plan;

        // Check plan overview
        expect(plan.plan_overview.macros).toHaveProperty('protein_g');
        expect(plan.plan_overview.macros).toHaveProperty('carbs_g');
        expect(plan.plan_overview.macros).toHaveProperty('fat_g');

        // Check daily schedule has meals
        const day1 = plan.daily_schedule.day_1;
        expect(day1).toBeDefined();
        expect(day1.breakfast).toBeDefined();
        expect(day1.breakfast.name).toBeTruthy();
        expect(Array.isArray(day1.breakfast.ingredients)).toBe(true);
        expect(day1.breakfast.nutrition).toBeDefined();
        expect(day1.lunch).toBeDefined();
        expect(day1.dinner).toBeDefined();
    });

    it('generates plan with Gemini API when key is present', async () => {
        process.env.GEMINI_API_KEY = 'test-api-key';

        const req = createRequest({
            messages: [
                { role: 'user', content: 'I love Mediterranean food' },
                { role: 'assistant', content: 'Great choice!' },
            ],
            dietIntakeData: mockDietIntakeData,
            intakeData: mockIntakeData,
        });

        const res = await POST(req);
        expect(res.status).toBe(200);

        const data = await res.json();
        expect(data.plan).toBeDefined();
        expect(data.plan.name).toBe('Test Nutrition Plan');
        expect(data.plan.dietary_preferences).toContain('Mediterranean');
    });
});
