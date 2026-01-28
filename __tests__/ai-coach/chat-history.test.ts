/**
 * @jest-environment node
 */

// Tests for the AI Coach chat history API route

const mockGetByUser = jest.fn();

jest.mock('@/lib/supabase', () => ({
    supabase: {},
}));

jest.mock('@/lib/supabaseDb', () => ({
    db: {
        aiChats: {
            getByUser: (...args: unknown[]) => mockGetByUser(...args),
        },
    },
}));

import { GET } from '@/app/api/ai-coach/chat/history/route';
import { NextRequest } from 'next/server';

function createRequest(params: Record<string, string> = {}): NextRequest {
    const url = new URL('http://localhost:3000/api/ai-coach/chat/history');
    Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
    return new NextRequest(url.toString());
}

describe('AI Coach Chat History API Route', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('returns 400 when userId is missing', async () => {
        const req = createRequest();
        const res = await GET(req);
        expect(res.status).toBe(400);
        const data = await res.json();
        expect(data.error).toContain('userId is required');
    });

    it('returns chats for a valid userId', async () => {
        const mockChats = [
            {
                id: 'chat-1',
                user_id: 'user-1',
                title: 'Test Chat',
                messages: [{ role: 'user', content: 'Hello', timestamp: '2025-01-01T00:00:00Z' }],
            },
        ];
        mockGetByUser.mockResolvedValue(mockChats);

        const req = createRequest({ userId: 'user-1' });
        const res = await GET(req);
        expect(res.status).toBe(200);

        const data = await res.json();
        expect(data.chats).toEqual(mockChats);
        expect(mockGetByUser).toHaveBeenCalledWith('user-1');
    });

    it('returns empty array when user has no chats', async () => {
        mockGetByUser.mockResolvedValue([]);

        const req = createRequest({ userId: 'user-2' });
        const res = await GET(req);
        expect(res.status).toBe(200);

        const data = await res.json();
        expect(data.chats).toEqual([]);
    });

    it('returns 500 on database error', async () => {
        mockGetByUser.mockRejectedValue(new Error('Database connection failed'));

        const req = createRequest({ userId: 'user-1' });
        const res = await GET(req);
        expect(res.status).toBe(500);

        const data = await res.json();
        expect(data.error).toContain('Database connection failed');
    });
});
