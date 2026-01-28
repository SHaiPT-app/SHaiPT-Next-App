/**
 * @jest-environment node
 */
import { POST } from '@/app/api/ai-coach/photo-assessment/route';
import { NextRequest } from 'next/server';

// Mock Google Generative AI
jest.mock('@google/generative-ai', () => ({
    GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
        getGenerativeModel: jest.fn().mockReturnValue({
            generateContent: jest.fn().mockResolvedValue({
                response: {
                    text: () => 'I can see you have a solid foundation. Your shoulders look great and I think we should focus on building your back width.',
                },
            }),
        }),
    })),
}));

function createRequest(body: Record<string, unknown>): NextRequest {
    return new NextRequest(new URL('/api/ai-coach/photo-assessment', 'http://localhost:3000'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
}

describe('Photo Assessment API', () => {
    const originalEnv = process.env;

    beforeEach(() => {
        jest.clearAllMocks();
        process.env = { ...originalEnv };
    });

    afterAll(() => {
        process.env = originalEnv;
    });

    it('returns 400 if coachId is missing', async () => {
        const req = createRequest({ photoCount: 3 });
        const res = await POST(req);
        expect(res.status).toBe(400);

        const data = await res.json();
        expect(data.error).toBe('coachId and photoCount are required');
    });

    it('returns 400 if photoCount is missing', async () => {
        const req = createRequest({ coachId: 'bodybuilding' });
        const res = await POST(req);
        expect(res.status).toBe(400);

        const data = await res.json();
        expect(data.error).toBe('coachId and photoCount are required');
    });

    it('returns mock assessment when no API key', async () => {
        delete process.env.GEMINI_API_KEY;

        const req = createRequest({ coachId: 'bodybuilding', photoCount: 3 });
        const res = await POST(req);
        expect(res.status).toBe(200);

        const data = await res.json();
        expect(data.assessment).toBeDefined();
        expect(typeof data.assessment).toBe('string');
        expect(data.assessment.length).toBeGreaterThan(0);
    });

    it('returns AI assessment when API key is present', async () => {
        process.env.GEMINI_API_KEY = 'test-api-key';

        const req = createRequest({ coachId: 'bodybuilding', photoCount: 3 });
        const res = await POST(req);
        expect(res.status).toBe(200);

        const data = await res.json();
        expect(data.assessment).toBeDefined();
        expect(data.assessment).toContain('solid foundation');
    });

    it('returns assessment for different coach IDs', async () => {
        delete process.env.GEMINI_API_KEY;

        const coaches = ['bodybuilding', 'booty-builder', 'crossfit', 'old-school', 'science-based'];

        for (const coachId of coaches) {
            const req = createRequest({ coachId, photoCount: 2 });
            const res = await POST(req);
            expect(res.status).toBe(200);

            const data = await res.json();
            expect(data.assessment).toBeDefined();
            expect(typeof data.assessment).toBe('string');
        }
    });

    it('falls back to everyday-fitness for unknown coach IDs', async () => {
        delete process.env.GEMINI_API_KEY;

        const req = createRequest({ coachId: 'unknown-coach-id', photoCount: 1 });
        const res = await POST(req);
        expect(res.status).toBe(200);

        const data = await res.json();
        expect(data.assessment).toBeDefined();
    });

    it('returns mock assessment on error', async () => {
        process.env.GEMINI_API_KEY = 'test-api-key';

        // Override the mock to throw
        const { GoogleGenerativeAI } = require('@google/generative-ai');
        GoogleGenerativeAI.mockImplementationOnce(() => ({
            getGenerativeModel: () => ({
                generateContent: jest.fn().mockRejectedValue(new Error('API Error')),
            }),
        }));

        const req = createRequest({ coachId: 'bodybuilding', photoCount: 3 });
        const res = await POST(req);
        expect(res.status).toBe(200);

        const data = await res.json();
        expect(data.assessment).toBeDefined();
        expect(typeof data.assessment).toBe('string');
    });
});
