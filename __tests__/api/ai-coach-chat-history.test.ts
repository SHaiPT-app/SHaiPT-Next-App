/**
 * @jest-environment node
 */
import { GET } from '@/app/api/ai-coach/chat/history/route';
import { NextRequest } from 'next/server';

// Mock dependencies
jest.mock('@supabase/supabase-js', () => ({
    createClient: jest.fn(),
}));

jest.mock('@/lib/supabase', () => ({
    supabase: {
        from: jest.fn(() => ({
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            order: jest.fn().mockResolvedValue({ data: [], error: null }),
        })),
    },
}));

jest.mock('@/lib/supabaseDb', () => ({
    db: {
        aiChats: {
            getByUser: jest.fn(),
        },
    },
}));

describe('/api/ai-coach/chat/history', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('returns 400 when no userId provided', async () => {
        const req = new NextRequest('http://localhost:3000/api/ai-coach/chat/history');
        const response = await GET(req);
        expect(response.status).toBe(400);

        const data = await response.json();
        expect(data.error).toBe('userId is required');
    });

    it('returns chats for valid userId', async () => {
        const { db } = require('@/lib/supabaseDb');
        const mockChats = [
            {
                id: 'chat-1',
                user_id: 'test-user',
                title: 'Test Chat',
                messages: [
                    { role: 'user', content: 'Hello', timestamp: '2025-01-20T00:00:00Z' },
                ],
                created_at: '2025-01-20T00:00:00Z',
                updated_at: '2025-01-20T00:00:00Z',
            },
        ];
        db.aiChats.getByUser.mockResolvedValue(mockChats);

        const req = new NextRequest('http://localhost:3000/api/ai-coach/chat/history?userId=test-user');
        const response = await GET(req);
        expect(response.status).toBe(200);

        const data = await response.json();
        expect(data.chats).toHaveLength(1);
        expect(data.chats[0].title).toBe('Test Chat');
    });

    it('returns empty array when no chats exist', async () => {
        const { db } = require('@/lib/supabaseDb');
        db.aiChats.getByUser.mockResolvedValue([]);

        const req = new NextRequest('http://localhost:3000/api/ai-coach/chat/history?userId=new-user');
        const response = await GET(req);
        expect(response.status).toBe(200);

        const data = await response.json();
        expect(data.chats).toHaveLength(0);
    });

    it('returns 500 on database error', async () => {
        const { db } = require('@/lib/supabaseDb');
        db.aiChats.getByUser.mockRejectedValue(new Error('Database error'));

        const req = new NextRequest('http://localhost:3000/api/ai-coach/chat/history?userId=test-user');
        const response = await GET(req);
        expect(response.status).toBe(500);

        const data = await response.json();
        expect(data.error).toBe('Database error');
    });
});
