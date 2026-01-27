/**
 * @jest-environment node
 */

// Tests for the AI Coach chat API route

// Mock the database module
const mockGetById = jest.fn();
const mockGetActiveByUser = jest.fn();
const mockGetByUser = jest.fn();
const mockGetByPlan = jest.fn();
const mockGetPlanById = jest.fn();
const mockCreateChat = jest.fn();
const mockUpdateChat = jest.fn();
const mockGetChatsByUser = jest.fn();

jest.mock('@/lib/supabaseDb', () => ({
    db: {
        profiles: { getById: (...args: unknown[]) => mockGetById(...args) },
        trainingPlanAssignments: { getActiveByUser: (...args: unknown[]) => mockGetActiveByUser(...args) },
        workoutLogs: { getByUser: (...args: unknown[]) => mockGetByUser(...args) },
        trainingPlans: { getById: (...args: unknown[]) => mockGetPlanById(...args) },
        trainingPlanSessions: { getByPlan: (...args: unknown[]) => mockGetByPlan(...args) },
        aiChats: {
            create: (...args: unknown[]) => mockCreateChat(...args),
            update: (...args: unknown[]) => mockUpdateChat(...args),
            getByUser: (...args: unknown[]) => mockGetChatsByUser(...args),
        },
    },
}));

jest.mock('@/lib/supabase', () => ({
    supabase: {},
}));

jest.mock('@google/generative-ai', () => ({
    GoogleGenerativeAI: jest.fn(),
}));

import { POST } from '@/app/api/ai-coach/chat/route';
import { NextRequest } from 'next/server';

function createRequest(body: object): NextRequest {
    return new NextRequest('http://localhost:3000/api/ai-coach/chat', {
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

describe('AI Coach Chat API Route', () => {
    const originalEnv = process.env;

    beforeEach(() => {
        jest.clearAllMocks();
        process.env = { ...originalEnv };
        // No API key by default (mock mode)
        delete process.env.GEMINI_API_KEY;

        mockCreateChat.mockResolvedValue({ id: 'new-chat-id', user_id: 'user-1', messages: [] });
        mockUpdateChat.mockResolvedValue({ id: 'existing-chat-id', user_id: 'user-1', messages: [] });
    });

    afterAll(() => {
        process.env = originalEnv;
    });

    it('returns 400 when messages array is missing', async () => {
        const req = createRequest({});
        const res = await POST(req);
        expect(res.status).toBe(400);
        const data = await res.json();
        expect(data.error).toContain('Messages array is required');
    });

    it('returns 400 when messages is empty array', async () => {
        const req = createRequest({ messages: [] });
        const res = await POST(req);
        expect(res.status).toBe(400);
    });

    it('returns a streaming mock response when no API key', async () => {
        const req = createRequest({
            messages: [{ role: 'user', content: 'Hello' }],
            userId: 'user-1',
        });

        mockGetById.mockResolvedValue(null);
        mockGetActiveByUser.mockResolvedValue(null);
        mockGetByUser.mockResolvedValue([]);

        const res = await POST(req);
        expect(res.status).toBe(200);
        expect(res.headers.get('Content-Type')).toBe('text/plain; charset=utf-8');

        const text = await readStream(res);
        expect(text.length).toBeGreaterThan(0);
    });

    it('saves new chat and returns chatId in header', async () => {
        const req = createRequest({
            messages: [{ role: 'user', content: 'Hello coach' }],
            userId: 'user-1',
        });

        mockGetById.mockResolvedValue(null);
        mockGetActiveByUser.mockResolvedValue(null);
        mockGetByUser.mockResolvedValue([]);

        const res = await POST(req);

        // Wait for stream to complete (triggers save)
        await readStream(res);

        expect(mockCreateChat).toHaveBeenCalledWith(
            expect.objectContaining({
                user_id: 'user-1',
                title: 'Hello coach',
            })
        );

        expect(res.headers.get('X-Chat-Id')).toBe('new-chat-id');
    });

    it('updates existing chat when chatId is provided', async () => {
        const req = createRequest({
            messages: [{ role: 'user', content: 'Follow up question' }],
            userId: 'user-1',
            chatId: 'existing-chat-id',
        });

        mockGetById.mockResolvedValue(null);
        mockGetActiveByUser.mockResolvedValue(null);
        mockGetByUser.mockResolvedValue([]);

        const res = await POST(req);
        await readStream(res);

        expect(mockUpdateChat).toHaveBeenCalledWith(
            'existing-chat-id',
            expect.objectContaining({
                messages: expect.any(Array),
            })
        );
    });

    it('builds context with profile data', async () => {
        mockGetById.mockResolvedValue({
            id: 'user-1',
            email: 'test@test.com',
            full_name: 'John Doe',
            fitness_goals: ['muscle gain', 'strength'],
            height_cm: 180,
            weight_kg: 85,
            gender: 'male',
        });
        mockGetActiveByUser.mockResolvedValue(null);
        mockGetByUser.mockResolvedValue([]);

        const req = createRequest({
            messages: [{ role: 'user', content: 'What should I eat?' }],
            userId: 'user-1',
        });

        const res = await POST(req);
        expect(res.status).toBe(200);
        await readStream(res);

        // The chat was created, which means context was built
        expect(mockGetById).toHaveBeenCalledWith('user-1');
    });

    it('builds context with active training plan', async () => {
        mockGetById.mockResolvedValue({
            id: 'user-1',
            email: 'test@test.com',
            full_name: 'Jane',
        });
        mockGetActiveByUser.mockResolvedValue({
            id: 'assign-1',
            plan_id: 'plan-1',
            user_id: 'user-1',
            start_date: '2025-01-01',
            end_date: '2025-03-01',
        });
        mockGetPlanById.mockResolvedValue({
            id: 'plan-1',
            creator_id: 'trainer-1',
            name: 'Strength Program',
            description: '12-week strength building',
            duration_weeks: 12,
        });
        mockGetByPlan.mockResolvedValue([
            { id: 's1', plan_id: 'plan-1', session_id: 'sess-1', day_number: 1 },
            { id: 's2', plan_id: 'plan-1', session_id: 'sess-2', day_number: 2 },
        ]);
        mockGetByUser.mockResolvedValue([]);

        const req = createRequest({
            messages: [{ role: 'user', content: 'How is my plan going?' }],
            userId: 'user-1',
        });

        const res = await POST(req);
        expect(res.status).toBe(200);
        await readStream(res);

        expect(mockGetPlanById).toHaveBeenCalledWith('plan-1');
        expect(mockGetByPlan).toHaveBeenCalledWith('plan-1');
    });

    it('builds context with recent workout logs', async () => {
        mockGetById.mockResolvedValue({ id: 'user-1', email: 'test@test.com' });
        mockGetActiveByUser.mockResolvedValue(null);
        mockGetByUser.mockResolvedValue([
            { id: 'log-1', user_id: 'user-1', date: '2025-01-20', total_duration_seconds: 3600 },
            { id: 'log-2', user_id: 'user-1', date: '2025-01-18', notes: 'Felt strong' },
        ]);

        const req = createRequest({
            messages: [{ role: 'user', content: 'Review my recent workouts' }],
            userId: 'user-1',
        });

        const res = await POST(req);
        expect(res.status).toBe(200);
        await readStream(res);

        expect(mockGetByUser).toHaveBeenCalledWith('user-1', 10);
    });

    it('handles context fetch failures gracefully', async () => {
        mockGetById.mockRejectedValue(new Error('DB error'));
        mockGetActiveByUser.mockRejectedValue(new Error('DB error'));
        mockGetByUser.mockRejectedValue(new Error('DB error'));

        const req = createRequest({
            messages: [{ role: 'user', content: 'Hello' }],
            userId: 'user-1',
        });

        const res = await POST(req);
        expect(res.status).toBe(200);
        // Should still work with empty context
        const text = await readStream(res);
        expect(text.length).toBeGreaterThan(0);
    });

    it('works without userId', async () => {
        const req = createRequest({
            messages: [{ role: 'user', content: 'General question' }],
        });

        const res = await POST(req);
        expect(res.status).toBe(200);
        const text = await readStream(res);
        expect(text.length).toBeGreaterThan(0);

        // Should not attempt to save chat
        expect(mockCreateChat).not.toHaveBeenCalled();
    });
});
