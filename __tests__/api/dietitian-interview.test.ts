/**
 * @jest-environment node
 */

/**
 * Tests for the dietitian interview API route
 */

// Mock Google Generative AI
jest.mock('@google/generative-ai', () => ({
    GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
        getGenerativeModel: jest.fn().mockReturnValue({
            startChat: jest.fn().mockReturnValue({
                sendMessageStream: jest.fn().mockResolvedValue({
                    stream: (async function* () {
                        yield { text: () => 'Hello! I am Dr. Nadia.' };
                    })(),
                }),
            }),
            generateContent: jest.fn().mockResolvedValue({
                response: {
                    text: () => JSON.stringify({
                        allergies: 'peanuts',
                        intolerances: 'lactose',
                        diet_style: 'Mediterranean',
                        foods_love: 'chicken, rice',
                        foods_hate: 'liver',
                        medical_dietary_considerations: 'none',
                        meals_per_day: '4',
                        cooking_preferences: 'meal prep',
                    }),
                },
            }),
        }),
    })),
}));

import { POST } from '@/app/api/ai-coach/dietitian-interview/route';
import { NextRequest } from 'next/server';

function createRequest(body: Record<string, unknown>): NextRequest {
    return new NextRequest('http://localhost:3000/api/ai-coach/dietitian-interview', {
        method: 'POST',
        body: JSON.stringify(body),
        headers: { 'Content-Type': 'application/json' },
    });
}

describe('/api/ai-coach/dietitian-interview', () => {
    const originalEnv = process.env;

    beforeEach(() => {
        jest.resetModules();
        process.env = { ...originalEnv };
    });

    afterAll(() => {
        process.env = originalEnv;
    });

    it('returns 400 when messages array is missing', async () => {
        const req = createRequest({ coachId: 'bodybuilding' });
        const res = await POST(req);
        expect(res.status).toBe(400);
        const data = await res.json();
        expect(data.error).toBe('Messages array is required');
    });

    it('returns streaming response for chat messages (mock mode)', async () => {
        delete process.env.GEMINI_API_KEY;

        const req = createRequest({
            messages: [
                { role: 'user', content: 'Hi Dr. Nadia' },
            ],
            coachId: 'bodybuilding',
        });

        const res = await POST(req);
        expect(res.status).toBe(200);
        expect(res.headers.get('Content-Type')).toBe('text/plain; charset=utf-8');

        // Read the stream
        const reader = res.body!.getReader();
        const decoder = new TextDecoder();
        let text = '';
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            text += decoder.decode(value, { stream: true });
        }

        // First message should be intro about allergies
        expect(text.length).toBeGreaterThan(0);
        expect(text.toLowerCase()).toContain('allerg');
    });

    it('returns mock follow-up response for subsequent messages', async () => {
        delete process.env.GEMINI_API_KEY;

        const req = createRequest({
            messages: [
                { role: 'user', content: 'Hi Dr. Nadia' },
                { role: 'assistant', content: 'Hello! Let me ask about allergies.' },
                { role: 'user', content: 'No allergies' },
            ],
            coachId: 'bodybuilding',
        });

        const res = await POST(req);
        expect(res.status).toBe(200);

        const reader = res.body!.getReader();
        const decoder = new TextDecoder();
        let text = '';
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            text += decoder.decode(value, { stream: true });
        }

        expect(text.length).toBeGreaterThan(0);
    });

    it('handles extract_form_data action in mock mode', async () => {
        delete process.env.GEMINI_API_KEY;

        const req = createRequest({
            messages: [
                { role: 'user', content: 'I am allergic to peanuts' },
                { role: 'assistant', content: 'Got it, peanut allergy noted.' },
            ],
            action: 'extract_form_data',
        });

        const res = await POST(req);
        expect(res.status).toBe(200);

        const data = await res.json();
        // In mock mode, returns empty form
        expect(data).toHaveProperty('allergies');
        expect(data).toHaveProperty('intolerances');
        expect(data).toHaveProperty('diet_style');
        expect(data).toHaveProperty('foods_love');
        expect(data).toHaveProperty('foods_hate');
        expect(data).toHaveProperty('medical_dietary_considerations');
        expect(data).toHaveProperty('meals_per_day');
        expect(data).toHaveProperty('cooking_preferences');
    });

    it('handles extract_form_data with Gemini API', async () => {
        process.env.GEMINI_API_KEY = 'test-api-key';

        const req = createRequest({
            messages: [
                { role: 'user', content: 'I am allergic to peanuts and prefer Mediterranean diet' },
                { role: 'assistant', content: 'Got it.' },
            ],
            action: 'extract_form_data',
        });

        const res = await POST(req);
        expect(res.status).toBe(200);

        const data = await res.json();
        expect(data.allergies).toBe('peanuts');
        expect(data.diet_style).toBe('Mediterranean');
    });
});
