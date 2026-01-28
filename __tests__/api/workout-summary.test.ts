/**
 * @jest-environment node
 */
import { POST } from '@/app/api/ai-coach/workout-summary/route';

// Mock Google Generative AI
jest.mock('@google/generative-ai', () => ({
    GoogleGenerativeAI: jest.fn(),
}));

const validBody = {
    sessionName: 'Push Day',
    durationMinutes: 45,
    totalVolume: 12500,
    totalSets: 12,
    totalReps: 96,
    weightUnit: 'lbs',
    exercises: [
        {
            name: 'Bench Press',
            sets: [
                { set_number: 1, weight: 135, reps: 10, weight_unit: 'lbs', rpe: 7 },
                { set_number: 2, weight: 135, reps: 10, weight_unit: 'lbs', rpe: 8 },
                { set_number: 3, weight: 155, reps: 8, weight_unit: 'lbs', rpe: 9 },
            ],
        },
        {
            name: 'Lateral Raise',
            sets: [
                { set_number: 1, weight: 30, reps: 12, weight_unit: 'lbs' },
                { set_number: 2, weight: 30, reps: 12, weight_unit: 'lbs' },
            ],
        },
    ],
    prsAchieved: [
        { exerciseName: 'Bench Press', weight: 155, reps: 8, unit: 'lbs' },
    ],
    userGoals: ['muscle gain', 'strength'],
};

describe('/api/ai-coach/workout-summary', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        delete process.env.GEMINI_API_KEY;
    });

    it('returns 400 when sessionName is missing', async () => {
        const req = new Request('http://localhost:3000/api/ai-coach/workout-summary', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ exercises: [{ name: 'Bench', sets: [] }] }),
        });

        const response = await POST(req as any);
        expect(response.status).toBe(400);
        const data = await response.json();
        expect(data.error).toBe('Session name and exercises are required');
    });

    it('returns 400 when exercises is empty', async () => {
        const req = new Request('http://localhost:3000/api/ai-coach/workout-summary', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionName: 'Push Day', exercises: [] }),
        });

        const response = await POST(req as any);
        expect(response.status).toBe(400);
    });

    it('returns mock feedback when no API key is set', async () => {
        const req = new Request('http://localhost:3000/api/ai-coach/workout-summary', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(validBody),
        });

        const response = await POST(req as any);
        expect(response.status).toBe(200);

        const data = await response.json();
        expect(data).toHaveProperty('feedback');
        expect(data).toHaveProperty('recommendations');
        expect(typeof data.feedback).toBe('string');
        expect(Array.isArray(data.recommendations)).toBe(true);
        expect(data.recommendations.length).toBeGreaterThan(0);
        expect(data.feedback.length).toBeGreaterThan(0);
    });

    it('returns valid JSON response structure', async () => {
        const req = new Request('http://localhost:3000/api/ai-coach/workout-summary', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(validBody),
        });

        const response = await POST(req as any);
        expect(response.status).toBe(200);
        expect(response.headers.get('Content-Type')).toBe('application/json');
    });

    it('works without optional fields (prsAchieved, userGoals)', async () => {
        const minimalBody = {
            sessionName: 'Leg Day',
            durationMinutes: 30,
            totalVolume: 5000,
            totalSets: 6,
            totalReps: 48,
            weightUnit: 'kg',
            exercises: [
                {
                    name: 'Squat',
                    sets: [
                        { set_number: 1, weight: 80, reps: 8, weight_unit: 'kg' },
                    ],
                },
            ],
            prsAchieved: [],
        };

        const req = new Request('http://localhost:3000/api/ai-coach/workout-summary', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(minimalBody),
        });

        const response = await POST(req as any);
        expect(response.status).toBe(200);

        const data = await response.json();
        expect(data.feedback).toBeTruthy();
        expect(data.recommendations).toBeTruthy();
    });

    it('uses Gemini API when API key is available', async () => {
        process.env.GEMINI_API_KEY = 'test-api-key';

        const mockGenerateContent = jest.fn().mockResolvedValue({
            response: {
                text: () => JSON.stringify({
                    feedback: 'Great workout session.',
                    recommendations: ['Increase weight', 'Add more sets', 'Rest more'],
                }),
            },
        });

        const { GoogleGenerativeAI } = require('@google/generative-ai');
        GoogleGenerativeAI.mockImplementation(() => ({
            getGenerativeModel: () => ({
                generateContent: mockGenerateContent,
            }),
        }));

        const req = new Request('http://localhost:3000/api/ai-coach/workout-summary', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(validBody),
        });

        const response = await POST(req as any);
        expect(response.status).toBe(200);

        const data = await response.json();
        expect(data.feedback).toBe('Great workout session.');
        expect(data.recommendations).toHaveLength(3);
        expect(mockGenerateContent).toHaveBeenCalled();
    });

    it('handles Gemini API returning non-JSON gracefully', async () => {
        process.env.GEMINI_API_KEY = 'test-api-key';

        const { GoogleGenerativeAI } = require('@google/generative-ai');
        GoogleGenerativeAI.mockImplementation(() => ({
            getGenerativeModel: () => ({
                generateContent: jest.fn().mockResolvedValue({
                    response: {
                        text: () => 'This is plain text feedback without JSON structure.',
                    },
                }),
            }),
        }));

        const req = new Request('http://localhost:3000/api/ai-coach/workout-summary', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(validBody),
        });

        const response = await POST(req as any);
        expect(response.status).toBe(200);

        const data = await response.json();
        expect(data.feedback).toBeTruthy();
        expect(data.recommendations).toHaveLength(3);
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

        const req = new Request('http://localhost:3000/api/ai-coach/workout-summary', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(validBody),
        });

        const response = await POST(req as any);
        expect(response.status).toBe(429);
    });

    it('handles Gemini API returning JSON in markdown code fences', async () => {
        process.env.GEMINI_API_KEY = 'test-api-key';

        const { GoogleGenerativeAI } = require('@google/generative-ai');
        GoogleGenerativeAI.mockImplementation(() => ({
            getGenerativeModel: () => ({
                generateContent: jest.fn().mockResolvedValue({
                    response: {
                        text: () => '```json\n{"feedback": "Well done.", "recommendations": ["Rest more", "Eat well", "Sleep early"]}\n```',
                    },
                }),
            }),
        }));

        const req = new Request('http://localhost:3000/api/ai-coach/workout-summary', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(validBody),
        });

        const response = await POST(req as any);
        expect(response.status).toBe(200);

        const data = await response.json();
        expect(data.feedback).toBe('Well done.');
        expect(data.recommendations).toEqual(['Rest more', 'Eat well', 'Sleep early']);
    });
});
