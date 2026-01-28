/**
 * @jest-environment node
 */
import { POST } from '@/app/api/ai-coach/chat/route';

// Mock dependencies
jest.mock('@supabase/supabase-js', () => ({
    createClient: jest.fn(),
}));

jest.mock('@/lib/supabase', () => ({
    supabase: {
        from: jest.fn(() => ({
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            order: jest.fn().mockReturnThis(),
            insert: jest.fn().mockReturnThis(),
            update: jest.fn().mockReturnThis(),
            single: jest.fn(),
        })),
        auth: {
            getUser: jest.fn(),
        },
    },
}));

jest.mock('@/lib/supabaseDb', () => ({
    db: {
        profiles: {
            getById: jest.fn().mockResolvedValue({
                id: 'test-user',
                full_name: 'Test User',
                fitness_goals: ['muscle gain', 'strength'],
                height_cm: 180,
                weight_kg: 80,
                gender: 'male',
            }),
        },
        trainingPlanAssignments: {
            getActiveByUser: jest.fn().mockResolvedValue([
                { id: 'plan-1', plan_id: 'tp-1' },
            ]),
        },
        workoutLogs: {
            getByUser: jest.fn().mockResolvedValue([
                { id: 'log-1', date: '2025-01-20', user_id: 'test-user' },
            ]),
        },
        aiChats: {
            create: jest.fn().mockResolvedValue({ id: 'chat-1' }),
            update: jest.fn().mockResolvedValue({ id: 'chat-1' }),
            getByUser: jest.fn().mockResolvedValue([]),
        },
    },
}));

// Mock Google Generative AI - not available without API key
jest.mock('@google/generative-ai', () => ({
    GoogleGenerativeAI: jest.fn(),
}));

describe('/api/ai-coach/chat', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        // Ensure no API key so mock responses are used
        delete process.env.GEMINI_API_KEY;
    });

    it('returns 400 when no messages provided', async () => {
        const req = new Request('http://localhost:3000/api/ai-coach/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: 'test-user' }),
        });

        const response = await POST(req as any);
        expect(response.status).toBe(400);

        const data = await response.json();
        expect(data.error).toBe('Messages array is required');
    });

    it('returns 400 when messages is empty array', async () => {
        const req = new Request('http://localhost:3000/api/ai-coach/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ messages: [], userId: 'test-user' }),
        });

        const response = await POST(req as any);
        expect(response.status).toBe(400);
    });

    it('returns streaming mock response when no API key', async () => {
        const req = new Request('http://localhost:3000/api/ai-coach/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                messages: [{ role: 'user', content: 'Help me with my workout' }],
                userId: 'test-user',
            }),
        });

        const response = await POST(req as any);
        expect(response.status).toBe(200);
        expect(response.headers.get('Content-Type')).toBe('text/plain; charset=utf-8');

        // Read the full streamed response
        const reader = response.body!.getReader();
        const decoder = new TextDecoder();
        let fullText = '';
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            fullText += decoder.decode(value, { stream: true });
        }

        expect(fullText.length).toBeGreaterThan(0);
    });

    it('saves chat history after successful response', async () => {
        const { db } = require('@/lib/supabaseDb');

        const req = new Request('http://localhost:3000/api/ai-coach/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                messages: [{ role: 'user', content: 'Help me with squats' }],
                userId: 'test-user',
            }),
        });

        const response = await POST(req as any);
        expect(response.status).toBe(200);

        // Consume the stream to trigger the save
        const reader = response.body!.getReader();
        while (true) {
            const { done } = await reader.read();
            if (done) break;
        }

        // Allow async save to complete
        await new Promise(resolve => setTimeout(resolve, 200));

        expect(db.aiChats.create).toHaveBeenCalledWith(
            expect.objectContaining({
                user_id: 'test-user',
                title: expect.any(String),
                messages: expect.arrayContaining([
                    expect.objectContaining({ role: 'user', content: 'Help me with squats' }),
                    expect.objectContaining({ role: 'assistant' }),
                ]),
            })
        );
    });

    it('updates existing chat when chatId is provided', async () => {
        const { db } = require('@/lib/supabaseDb');

        const req = new Request('http://localhost:3000/api/ai-coach/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                messages: [{ role: 'user', content: 'Follow up question' }],
                userId: 'test-user',
                chatId: 'existing-chat-id',
            }),
        });

        const response = await POST(req as any);
        expect(response.status).toBe(200);

        // Consume stream
        const reader = response.body!.getReader();
        while (true) {
            const { done } = await reader.read();
            if (done) break;
        }

        await new Promise(resolve => setTimeout(resolve, 200));

        expect(db.aiChats.update).toHaveBeenCalledWith(
            'existing-chat-id',
            expect.objectContaining({
                messages: expect.any(Array),
            })
        );
    });

    it('works without userId (anonymous usage)', async () => {
        const req = new Request('http://localhost:3000/api/ai-coach/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                messages: [{ role: 'user', content: 'Quick question' }],
            }),
        });

        const response = await POST(req as any);
        expect(response.status).toBe(200);

        // Consume stream
        const reader = response.body!.getReader();
        let fullText = '';
        const decoder = new TextDecoder();
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            fullText += decoder.decode(value, { stream: true });
        }

        expect(fullText.length).toBeGreaterThan(0);
    });
});
