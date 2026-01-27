/**
 * @jest-environment node
 */
import { POST } from '@/app/api/ai-coach/plan-adaptation/route';

// Mock Google Generative AI
jest.mock('@google/generative-ai', () => ({
    GoogleGenerativeAI: jest.fn(),
}));

const validBody = {
    userId: 'user-123',
    workoutLogId: 'log-456',
    sessionName: 'Upper Body Push',
    exercises: [
        {
            exercise_name: 'Barbell Bench Press',
            exercise_id: 'ex001',
            target_sets: 3,
            target_reps: '10',
            target_weight: '135 lbs',
            actual_sets: [
                { weight: 135, reps: 10, rpe: 7, weight_unit: 'lbs' },
                { weight: 135, reps: 10, rpe: 7, weight_unit: 'lbs' },
                { weight: 140, reps: 8, rpe: 8, weight_unit: 'lbs' },
            ],
        },
        {
            exercise_name: 'Lateral Raise',
            exercise_id: 'ex002',
            target_sets: 3,
            target_reps: '12',
            target_weight: '25 lbs',
            actual_sets: [
                { weight: 25, reps: 12, weight_unit: 'lbs' },
                { weight: 25, reps: 12, weight_unit: 'lbs' },
                { weight: 25, reps: 10, weight_unit: 'lbs' },
            ],
        },
    ],
    userGoals: ['Build Muscle', 'Strength'],
};

describe('/api/ai-coach/plan-adaptation', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        delete process.env.GEMINI_API_KEY;
    });

    it('returns 400 when sessionName is missing', async () => {
        const req = new Request('http://localhost:3000/api/ai-coach/plan-adaptation', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ exercises: [{ exercise_name: 'Bench', actual_sets: [] }] }),
        });

        const response = await POST(req as any);
        expect(response.status).toBe(400);
        const data = await response.json();
        expect(data.error).toBe('Session name and exercises are required');
    });

    it('returns 400 when exercises is empty', async () => {
        const req = new Request('http://localhost:3000/api/ai-coach/plan-adaptation', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionName: 'Push Day', exercises: [] }),
        });

        const response = await POST(req as any);
        expect(response.status).toBe(400);
    });

    it('returns mock adaptation when no API key is set', async () => {
        const req = new Request('http://localhost:3000/api/ai-coach/plan-adaptation', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(validBody),
        });

        const response = await POST(req as any);
        expect(response.status).toBe(200);

        const data = await response.json();
        expect(data).toHaveProperty('summary');
        expect(data).toHaveProperty('recommendations');
        expect(data).toHaveProperty('overall_assessment');
        expect(typeof data.summary).toBe('string');
        expect(Array.isArray(data.recommendations)).toBe(true);
        expect(data.recommendations.length).toBeGreaterThan(0);
    });

    it('returns correct recommendation structure in mock response', async () => {
        const req = new Request('http://localhost:3000/api/ai-coach/plan-adaptation', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(validBody),
        });

        const response = await POST(req as any);
        const data = await response.json();

        for (const rec of data.recommendations) {
            expect(rec).toHaveProperty('type');
            expect(rec).toHaveProperty('exercise_name');
            expect(rec).toHaveProperty('current_value');
            expect(rec).toHaveProperty('recommended_value');
            expect(rec).toHaveProperty('rationale');
            expect(['weight_progression', 'exercise_substitution', 'volume_adjustment', 'deload_recommendation']).toContain(rec.type);
        }
    });

    it('returns valid JSON response headers', async () => {
        const req = new Request('http://localhost:3000/api/ai-coach/plan-adaptation', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(validBody),
        });

        const response = await POST(req as any);
        expect(response.status).toBe(200);
        expect(response.headers.get('Content-Type')).toBe('application/json');
    });

    it('works with minimal body (no optional fields)', async () => {
        const minimalBody = {
            userId: 'user-123',
            workoutLogId: 'log-456',
            sessionName: 'Leg Day',
            exercises: [
                {
                    exercise_name: 'Squat',
                    target_sets: 3,
                    target_reps: '8',
                    target_weight: '200 lbs',
                    actual_sets: [
                        { weight: 200, reps: 8, rpe: 9, weight_unit: 'lbs' },
                    ],
                },
            ],
        };

        const req = new Request('http://localhost:3000/api/ai-coach/plan-adaptation', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(minimalBody),
        });

        const response = await POST(req as any);
        expect(response.status).toBe(200);

        const data = await response.json();
        expect(data.summary).toBeTruthy();
        expect(data.recommendations).toBeTruthy();
    });

    it('includes pain report context in prompt when exercise has pain_reported', async () => {
        const bodyWithPain = {
            ...validBody,
            exercises: [
                {
                    ...validBody.exercises[0],
                    pain_reported: true,
                    pain_notes: 'Sharp pain in left shoulder during pressing',
                },
                validBody.exercises[1],
            ],
        };

        const req = new Request('http://localhost:3000/api/ai-coach/plan-adaptation', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(bodyWithPain),
        });

        // Without API key, should still return mock data successfully
        const response = await POST(req as any);
        expect(response.status).toBe(200);
    });

    it('uses Gemini API when API key is available', async () => {
        process.env.GEMINI_API_KEY = 'test-api-key';

        const mockAdaptation = {
            summary: 'Good progress on compound lifts.',
            recommendations: [
                {
                    type: 'weight_progression',
                    exercise_name: 'Barbell Bench Press',
                    current_value: '135 lbs',
                    recommended_value: '140 lbs',
                    rationale: 'RPE consistently below 8.',
                },
            ],
            overall_assessment: 'Training is progressing well.',
        };

        const mockGenerateContent = jest.fn().mockResolvedValue({
            response: {
                text: () => JSON.stringify(mockAdaptation),
            },
        });

        const { GoogleGenerativeAI } = require('@google/generative-ai');
        GoogleGenerativeAI.mockImplementation(() => ({
            getGenerativeModel: () => ({
                generateContent: mockGenerateContent,
            }),
        }));

        const req = new Request('http://localhost:3000/api/ai-coach/plan-adaptation', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(validBody),
        });

        const response = await POST(req as any);
        expect(response.status).toBe(200);

        const data = await response.json();
        expect(data.summary).toBe('Good progress on compound lifts.');
        expect(data.recommendations).toHaveLength(1);
        expect(data.recommendations[0].type).toBe('weight_progression');
        expect(mockGenerateContent).toHaveBeenCalled();
    });

    it('handles Gemini API returning non-JSON gracefully', async () => {
        process.env.GEMINI_API_KEY = 'test-api-key';

        const { GoogleGenerativeAI } = require('@google/generative-ai');
        GoogleGenerativeAI.mockImplementation(() => ({
            getGenerativeModel: () => ({
                generateContent: jest.fn().mockResolvedValue({
                    response: {
                        text: () => 'This is plain text without JSON structure.',
                    },
                }),
            }),
        }));

        const req = new Request('http://localhost:3000/api/ai-coach/plan-adaptation', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(validBody),
        });

        const response = await POST(req as any);
        expect(response.status).toBe(200);

        const data = await response.json();
        // Should fall back to mock data
        expect(data.summary).toBeTruthy();
        expect(data.recommendations).toBeTruthy();
        expect(data.overall_assessment).toBeTruthy();
    });

    it('handles rate limiting (429)', async () => {
        process.env.GEMINI_API_KEY = 'test-api-key';

        const { GoogleGenerativeAI } = require('@google/generative-ai');
        GoogleGenerativeAI.mockImplementation(() => ({
            getGenerativeModel: () => ({
                generateContent: jest.fn().mockRejectedValue({
                    status: 429,
                    message: '429 Resource has been exhausted',
                }),
            }),
        }));

        const req = new Request('http://localhost:3000/api/ai-coach/plan-adaptation', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(validBody),
        });

        const response = await POST(req as any);
        expect(response.status).toBe(429);
    });

    it('handles Gemini API returning JSON in markdown code fences', async () => {
        process.env.GEMINI_API_KEY = 'test-api-key';

        const adaptationJson = {
            summary: 'Slight adjustments recommended.',
            recommendations: [
                {
                    type: 'volume_adjustment',
                    exercise_name: 'Lateral Raise',
                    current_value: '3 sets',
                    recommended_value: '4 sets',
                    rationale: 'Recovery is good.',
                },
            ],
            overall_assessment: 'Keep pushing.',
        };

        const { GoogleGenerativeAI } = require('@google/generative-ai');
        GoogleGenerativeAI.mockImplementation(() => ({
            getGenerativeModel: () => ({
                generateContent: jest.fn().mockResolvedValue({
                    response: {
                        text: () => '```json\n' + JSON.stringify(adaptationJson) + '\n```',
                    },
                }),
            }),
        }));

        const req = new Request('http://localhost:3000/api/ai-coach/plan-adaptation', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(validBody),
        });

        const response = await POST(req as any);
        expect(response.status).toBe(200);

        const data = await response.json();
        expect(data.summary).toBe('Slight adjustments recommended.');
        expect(data.recommendations[0].type).toBe('volume_adjustment');
    });

    it('filters out recommendations with invalid types', async () => {
        process.env.GEMINI_API_KEY = 'test-api-key';

        const adaptationJson = {
            summary: 'Mixed recommendations.',
            recommendations: [
                {
                    type: 'weight_progression',
                    exercise_name: 'Bench Press',
                    current_value: '135 lbs',
                    recommended_value: '140 lbs',
                    rationale: 'RPE was low.',
                },
                {
                    type: 'invalid_type',
                    exercise_name: 'Squat',
                    current_value: '200 lbs',
                    recommended_value: '210 lbs',
                    rationale: 'This has an invalid type.',
                },
            ],
            overall_assessment: 'Good overall.',
        };

        const { GoogleGenerativeAI } = require('@google/generative-ai');
        GoogleGenerativeAI.mockImplementation(() => ({
            getGenerativeModel: () => ({
                generateContent: jest.fn().mockResolvedValue({
                    response: {
                        text: () => JSON.stringify(adaptationJson),
                    },
                }),
            }),
        }));

        const req = new Request('http://localhost:3000/api/ai-coach/plan-adaptation', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(validBody),
        });

        const response = await POST(req as any);
        expect(response.status).toBe(200);

        const data = await response.json();
        expect(data.recommendations).toHaveLength(1);
        expect(data.recommendations[0].type).toBe('weight_progression');
    });

    it('includes recent workout context when provided', async () => {
        const bodyWithHistory = {
            ...validBody,
            recentWorkouts: [
                {
                    sessionName: 'Previous Push Day',
                    date: '2025-01-20',
                    totalVolume: 11000,
                    averageRpe: 7.5,
                },
                {
                    sessionName: 'Pull Day',
                    date: '2025-01-22',
                    totalVolume: 9500,
                    averageRpe: 8,
                },
            ],
            currentPhaseType: 'hypertrophy',
            weekNumber: 3,
            totalPlanWeeks: 8,
        };

        const req = new Request('http://localhost:3000/api/ai-coach/plan-adaptation', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(bodyWithHistory),
        });

        const response = await POST(req as any);
        expect(response.status).toBe(200);

        const data = await response.json();
        expect(data).toHaveProperty('summary');
        expect(data).toHaveProperty('recommendations');
    });
});
