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

import { POST } from '@/app/api/ai-coach/interview/route';
import { NextRequest } from 'next/server';

function createRequest(body: object): NextRequest {
    return new NextRequest('http://localhost:3000/api/ai-coach/interview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
}

async function readStream(response: Response): Promise<string> {
    const reader = response.body?.getReader();
    if (!reader) return '';
    const decoder = new TextDecoder();
    let result = '';
    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        result += decoder.decode(value, { stream: true });
    }
    return result;
}

describe('Coach Interview API Route', () => {
    const originalEnv = process.env;

    beforeEach(() => {
        jest.clearAllMocks();
        process.env = { ...originalEnv };
        delete process.env.GEMINI_API_KEY;
    });

    afterAll(() => {
        process.env = originalEnv;
    });

    it('returns 400 when messages array is missing', async () => {
        const req = createRequest({ coachId: 'bodybuilding' });
        const res = await POST(req);
        expect(res.status).toBe(400);
        const data = await res.json();
        expect(data.error).toContain('Messages array is required');
    });

    it('returns 400 when coachId is missing', async () => {
        const req = createRequest({
            messages: [{ role: 'user', content: 'Hello' }],
        });
        const res = await POST(req);
        expect(res.status).toBe(400);
        const data = await res.json();
        expect(data.error).toContain('Coach ID is required');
    });

    it('returns a streaming mock response for valid request without API key', async () => {
        const req = createRequest({
            messages: [{ role: 'user', content: 'Hello' }],
            coachId: 'bodybuilding',
        });

        const res = await POST(req);
        expect(res.status).toBe(200);
        expect(res.headers.get('Content-Type')).toBe('text/plain; charset=utf-8');

        const text = await readStream(res);
        expect(text.length).toBeGreaterThan(0);
    });

    it('returns mock intro for first message', async () => {
        const req = createRequest({
            messages: [{ role: 'user', content: 'Hi' }],
            coachId: 'crossfit',
        });

        const res = await POST(req);
        const text = await readStream(res);
        expect(text).toContain('coach');
    });

    it('returns mock followup for subsequent messages', async () => {
        const req = createRequest({
            messages: [
                { role: 'user', content: 'Hi' },
                { role: 'assistant', content: 'Hello there!' },
                { role: 'user', content: 'I am 27 years old' },
            ],
            coachId: 'bodybuilding',
        });

        const res = await POST(req);
        const text = await readStream(res);
        expect(text.length).toBeGreaterThan(0);
    });

    it('handles extract_form_data action without API key', async () => {
        const req = createRequest({
            messages: [
                { role: 'user', content: 'I am John, 27 years old' },
                { role: 'assistant', content: 'Great!' },
            ],
            action: 'extract_form_data',
        });

        const res = await POST(req);
        expect(res.status).toBe(200);
        const data = await res.json();
        // In mock mode, returns empty form data
        expect(data).toHaveProperty('name');
        expect(data).toHaveProperty('age');
        expect(data).toHaveProperty('height');
        expect(data).toHaveProperty('weight');
        expect(data).toHaveProperty('fitness_goals');
        expect(data).toHaveProperty('fitness_level');
    });

    it('returns all 16 intake form fields in extract response', async () => {
        const req = createRequest({
            messages: [{ role: 'user', content: 'test' }],
            action: 'extract_form_data',
        });

        const res = await POST(req);
        const data = await res.json();
        const expectedFields = [
            'name', 'age', 'height', 'weight',
            'sport_history', 'training_duration', 'training_style',
            'fitness_goals',
            'training_days_per_week', 'session_duration', 'preferred_time',
            'available_equipment', 'training_location',
            'injuries', 'medical_considerations',
            'fitness_level',
        ];
        for (const field of expectedFields) {
            expect(data).toHaveProperty(field);
        }
    });

    it('supports all 10 coach personas', async () => {
        const coachIds = [
            'bodybuilding', 'booty-builder', 'crossfit', 'old-school',
            'science-based', 'beach-body', 'everyday-fitness',
            'athletic-functionality', 'sport-basketball', 'sport-climbing',
        ];

        for (const coachId of coachIds) {
            const req = createRequest({
                messages: [{ role: 'user', content: 'Hello' }],
                coachId,
            });

            const res = await POST(req);
            expect(res.status).toBe(200);
            const text = await readStream(res);
            expect(text.length).toBeGreaterThan(0);
        }
    }, 15000);

    it('handles unknown coach ID gracefully', async () => {
        const req = createRequest({
            messages: [{ role: 'user', content: 'Hello' }],
            coachId: 'unknown-coach',
        });

        const res = await POST(req);
        expect(res.status).toBe(200);
        // Falls back to everyday-fitness persona
        const text = await readStream(res);
        expect(text.length).toBeGreaterThan(0);
    });
});
